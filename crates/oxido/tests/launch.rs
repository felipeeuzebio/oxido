//! The launch file: the next unused launch link, kept in `.oxido/launch` so a
//! second `oxido` in the same project can open the browser instead of failing.

use oxido::launch::Launch;
use oxido::server::{AppState, Config, router};
use oxido::store::Store;
use oxido::ui::MemoryAssets;

const INSTANCE: &str = "instance-00112233445566778899";

fn sample(port: u16) -> Launch {
    Launch {
        port,
        instance: INSTANCE.into(),
        token: "0123456789abcdef0123456789abcdef".into(),
    }
}

#[test]
fn round_trips_through_the_file() {
    let dir = tempfile::tempdir().unwrap();
    let file = dir.path().join("launch");
    sample(7878).write(&file).unwrap();
    assert_eq!(Launch::read(&file), Some(sample(7878)));
    assert_eq!(
        sample(7878).url(),
        "http://127.0.0.1:7878/?token=0123456789abcdef0123456789abcdef"
    );
}

#[test]
fn a_missing_or_damaged_file_reads_as_nothing() {
    let dir = tempfile::tempdir().unwrap();
    let file = dir.path().join("launch");
    assert_eq!(Launch::read(&file), None);
    std::fs::write(&file, "not json").unwrap();
    assert_eq!(Launch::read(&file), None);
}

/// Serves oxido's router on a free port and returns that port.
async fn running_oxido() -> u16 {
    let listener = tokio::net::TcpListener::bind(("127.0.0.1", 0))
        .await
        .unwrap();
    let port = listener.local_addr().unwrap().port();
    let config = Config {
        launch_token: "unused".into(),
        session_secret: "secret".into(),
        port,
        extra_origins: vec![],
        instance: INSTANCE.into(),
        launch_file: None,
    };
    let app = router(AppState::new(
        Store::open_in_memory().unwrap(),
        config,
        MemoryAssets::new(),
    ));
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    port
}

async fn is_running(launch: Launch) -> bool {
    tokio::task::spawn_blocking(move || launch.is_running())
        .await
        .unwrap()
}

#[tokio::test(flavor = "multi_thread")]
async fn recognizes_the_oxido_that_wrote_the_file() {
    let port = running_oxido().await;
    assert!(is_running(sample(port)).await);
}

#[tokio::test(flavor = "multi_thread")]
async fn a_different_oxido_on_the_port_is_not_it() {
    let port = running_oxido().await;
    let other = Launch {
        instance: "someone-else".into(),
        ..sample(port)
    };
    assert!(!is_running(other).await);
}

#[tokio::test(flavor = "multi_thread")]
async fn nothing_listening_means_not_running() {
    let port = {
        let listener = std::net::TcpListener::bind(("127.0.0.1", 0)).unwrap();
        listener.local_addr().unwrap().port()
    };
    assert!(!is_running(sample(port)).await);
}
