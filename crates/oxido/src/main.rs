use std::path::{Path, PathBuf};
use std::process::ExitCode;

use anyhow::Context;
use clap::{Parser, Subcommand};
use oxido::server::{AppState, Config, router};
use oxido::store::Store;
use oxido::ui::EmbeddedAssets;
use tokio::net::TcpListener;

/// Oxidō: learn Rust by building a small SQL database.
#[derive(Parser)]
#[command(name = "oxido", version, about)]
struct Cli {
    #[command(subcommand)]
    command: Option<Command>,
}

/// The port `oxido` starts on unless told otherwise.
const DEFAULT_PORT: u16 = 7878;

#[derive(Subcommand)]
enum Command {
    /// Start the course in your browser (the default). Ctrl+C stops it.
    Serve(ServeArgs),
    /// Check that everything the course needs is in place, and say how to fix
    /// what isn't. Changes nothing.
    Doctor(DoctorArgs),
}

#[derive(clap::Args)]
struct ServeArgs {
    /// Port on 127.0.0.1. Keep the default so your browser remembers settings.
    #[arg(long, default_value_t = DEFAULT_PORT)]
    port: u16,
    /// Your minisql project folder, or any folder inside it (the one with
    /// oxido.toml). Progress is saved in its .oxido/ folder.
    #[arg(long, default_value = ".")]
    project: PathBuf,
    /// Don't open the browser.
    #[arg(long)]
    no_open: bool,
    /// Also accept the Vite dev server (http://127.0.0.1:5173), for working on oxido itself.
    #[arg(long)]
    dev: bool,
}

#[derive(clap::Args)]
struct DoctorArgs {
    /// Your minisql project folder, or any folder inside it.
    #[arg(long, default_value = ".")]
    project: PathBuf,
    /// The port you start oxido on.
    #[arg(long, default_value_t = DEFAULT_PORT)]
    port: u16,
}

impl Default for ServeArgs {
    fn default() -> Self {
        Self {
            port: DEFAULT_PORT,
            project: PathBuf::from("."),
            no_open: false,
            dev: false,
        }
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<ExitCode> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "oxido=info".into()),
        )
        .with_target(false)
        .init();

    match Cli::parse().command {
        Some(Command::Serve(args)) => serve(args).await.map(|()| ExitCode::SUCCESS),
        Some(Command::Doctor(args)) => Ok(doctor(&args)),
        None => serve(ServeArgs::default())
            .await
            .map(|()| ExitCode::SUCCESS),
    }
}

/// Prints the report. Fails (exit code 1) only when something must be fixed.
fn doctor(args: &DoctorArgs) -> ExitCode {
    // The header first: asking rustc can take a while when rustup has to
    // install the toolchain a project asks for.
    println!("Oxidō doctor, oxido {}\n", env!("CARGO_PKG_VERSION"));
    let checks = oxido::doctor::run(&args.project, args.port);
    print!("{}", oxido_core::doctor::render(&checks));
    if oxido_core::doctor::passed(&checks) {
        ExitCode::SUCCESS
    } else {
        ExitCode::FAILURE
    }
}

async fn serve(args: ServeArgs) -> anyhow::Result<()> {
    let project = oxido::project::find(&args.project)?;
    let launch_file = oxido::launch::path(&project);

    // Already running for this project? Open its next launch link instead.
    if let Some(running) = oxido::launch::Launch::read(&launch_file) {
        let running =
            tokio::task::spawn_blocking(move || running.is_running().then_some(running)).await?;
        if let Some(running) = running {
            let url = running.url();
            println!("Oxidō is already running for this project: {url}");
            if args.no_open || webbrowser::open(&url).is_err() {
                println!("Open the link above in your browser.");
            }
            return Ok(());
        }
    }

    let store = open_store(&project)?;
    // OXIDO_TOKEN fixes the launch token for automated tests; students never need it.
    let launch_token = match std::env::var("OXIDO_TOKEN") {
        Ok(token) if !token.is_empty() => token,
        _ => oxido::random_token()?,
    };

    let listener = TcpListener::bind(("127.0.0.1", args.port))
        .await
        .with_context(|| {
            format!(
                "port {} is busy. Is oxido already running? Otherwise try --port",
                args.port
            )
        })?;
    let port = listener.local_addr()?.port();

    let extra_origins = if args.dev {
        vec![
            "http://127.0.0.1:5173".into(),
            "http://localhost:5173".into(),
        ]
    } else {
        vec![]
    };
    let config = Config {
        launch_token: launch_token.clone(),
        session_secret: oxido::random_token()?,
        port,
        extra_origins,
        instance: oxido::random_token()?,
        launch_file: Some(launch_file.clone()),
    };
    let state = AppState::new(store, config, EmbeddedAssets);
    if EmbeddedAssets::is_empty() {
        tracing::warn!("the web UI isn't built: run `bun run build`, then rebuild oxido");
    }

    let url = format!("http://127.0.0.1:{port}/?token={launch_token}");
    println!("Oxidō is running at {url}");
    println!("Press Ctrl+C to stop.");
    if !args.no_open && webbrowser::open(&url).is_err() {
        println!("Couldn't open a browser; open the link above yourself.");
    }

    axum::serve(listener, router(state))
        .with_graceful_shutdown(stop_requested())
        .await?;
    let _ = std::fs::remove_file(&launch_file);
    println!("Stopped. Your progress is saved.");
    Ok(())
}

/// Waits for Ctrl+C, or on Unix for SIGTERM (what process managers and
/// `kill` send), so either way oxido stops cleanly and removes its launch file.
async fn stop_requested() {
    let ctrl_c = async {
        let _ = tokio::signal::ctrl_c().await;
    };
    #[cfg(unix)]
    let terminate = async {
        use tokio::signal::unix::{SignalKind, signal};
        match signal(SignalKind::terminate()) {
            Ok(mut terminate) => {
                terminate.recv().await;
            }
            Err(_) => std::future::pending::<()>().await,
        }
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! {
        () = ctrl_c => {}
        () = terminate => {}
    }
}

/// Opens `<project>/.oxido/oxido.db`, creating the folder (git-ignored) if needed.
fn open_store(project: &Path) -> anyhow::Result<Store> {
    let dir = project.join(".oxido");
    std::fs::create_dir_all(&dir).with_context(|| format!("can't create {}", dir.display()))?;
    let ignore = dir.join(".gitignore");
    if !ignore.exists() {
        // The database is binary and personal (it holds your notes): keep it out of git.
        std::fs::write(&ignore, "*\n")
            .with_context(|| format!("can't write {}", ignore.display()))?;
    }
    Store::open(&dir.join("oxido.db")).context("can't open your progress database")
}
