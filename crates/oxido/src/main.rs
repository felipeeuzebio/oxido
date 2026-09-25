use std::path::{Path, PathBuf};

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

#[derive(Subcommand)]
enum Command {
    /// Start the course in your browser (the default). Ctrl+C stops it.
    Serve(ServeArgs),
}

#[derive(clap::Args)]
struct ServeArgs {
    /// Port on 127.0.0.1. Keep the default so your browser remembers settings.
    #[arg(long, default_value_t = 7878)]
    port: u16,
    /// Your minisql project folder. Progress is saved in its .oxido/ folder.
    #[arg(long, default_value = ".")]
    project: PathBuf,
    /// Don't open the browser.
    #[arg(long)]
    no_open: bool,
    /// Also accept the Vite dev server (http://127.0.0.1:5173), for working on oxido itself.
    #[arg(long)]
    dev: bool,
}

impl Default for ServeArgs {
    fn default() -> Self {
        Self {
            port: 7878,
            project: PathBuf::from("."),
            no_open: false,
            dev: false,
        }
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "oxido=info".into()),
        )
        .with_target(false)
        .init();

    match Cli::parse().command {
        Some(Command::Serve(args)) => serve(args).await,
        None => serve(ServeArgs::default()).await,
    }
}

async fn serve(args: ServeArgs) -> anyhow::Result<()> {
    let store = open_store(&args.project)?;
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
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
        })
        .await?;
    println!("Stopped. Your progress is saved.");
    Ok(())
}

/// Opens `<project>/.oxido/oxido.db`, creating the folder (git-ignored) if needed.
fn open_store(project: &Path) -> anyhow::Result<Store> {
    let project = project
        .canonicalize()
        .with_context(|| format!("can't find the project folder {}", project.display()))?;
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
