//! The local server: the embedded UI, the JSON API and the checks that keep
//! other websites from talking to it.

use axum::Router;
use axum::body::Body;
use axum::http::{HeaderMap, Request, StatusCode, header};
use http_body_util::BodyExt;
use oxido::launch::Launch;
use oxido::server::{AppState, Config, router};
use oxido::store::Store;
use oxido::ui::MemoryAssets;
use serde_json::{Value, json};
use tower::ServiceExt;

const TOKEN: &str = "launch-token-0123456789abcdef";
const SECRET: &str = "session-secret-fedcba9876543210";
const HOST: &str = "127.0.0.1:7878";
const ORIGIN: &str = "http://127.0.0.1:7878";
const COOKIE_NAME: &str = "oxido_session_7878";
const INSTANCE: &str = "instance-00112233445566778899";

fn config() -> Config {
    Config {
        launch_token: TOKEN.into(),
        session_secret: SECRET.into(),
        port: 7878,
        extra_origins: vec![],
        instance: INSTANCE.into(),
        launch_file: None,
    }
}

fn app() -> Router {
    app_with(config())
}

fn app_with(config: Config) -> Router {
    let assets = MemoryAssets::new()
        .with("index.html", "text/html", "<h1>home</h1>")
        .with("__spa-fallback.html", "text/html", "<div id=spa></div>")
        .with("assets/app-1234.js", "text/javascript", "console.log(1)");
    router(AppState::new(
        Store::open_in_memory().unwrap(),
        config,
        assets,
    ))
}

fn get(path: &str) -> axum::http::request::Builder {
    Request::get(path).header(header::HOST, HOST)
}

async fn send(app: &Router, request: Request<Body>) -> (StatusCode, HeaderMap, String) {
    let response = app.clone().oneshot(request).await.unwrap();
    let status = response.status();
    let headers = response.headers().clone();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    (
        status,
        headers,
        String::from_utf8_lossy(&bytes).into_owned(),
    )
}

async fn open(app: &Router, path: &str) -> (StatusCode, HeaderMap, String) {
    send(app, get(path).body(Body::empty()).unwrap()).await
}

/// Opens the launch link and returns the session cookie it set.
async fn login(app: &Router) -> String {
    let (_, headers, _) = open(app, &format!("/?token={TOKEN}")).await;
    let cookie = headers[header::SET_COOKIE].to_str().unwrap();
    cookie.split(';').next().unwrap().to_string()
}

/// oxido's own page, after opening the launch link.
struct Client {
    app: Router,
    cookie: String,
}

async fn client() -> Client {
    let app = app();
    let cookie = login(&app).await;
    Client { app, cookie }
}

impl Client {
    async fn api(&self, method: &str, path: &str, body: Option<Value>) -> (StatusCode, Value) {
        let request = Request::builder()
            .method(method)
            .uri(path)
            .header(header::HOST, HOST)
            .header(header::ORIGIN, ORIGIN)
            .header(header::COOKIE, &self.cookie);
        let body = body.map(|json| ("application/json", json.to_string()));
        raw_api(&self.app, request, body).await
    }
}

async fn raw_api(
    app: &Router,
    mut request: axum::http::request::Builder,
    body: Option<(&str, String)>,
) -> (StatusCode, Value) {
    let body = match body {
        Some((content_type, text)) => {
            request = request.header(header::CONTENT_TYPE, content_type);
            Body::from(text)
        }
        None => Body::empty(),
    };
    let (status, _, text) = send(app, request.body(body).unwrap()).await;
    let value = if text.is_empty() {
        Value::Null
    } else {
        serde_json::from_str(&text).unwrap_or_else(|_| panic!("not JSON: {text}"))
    };
    (status, value)
}

async fn write_from(origin: &str) -> StatusCode {
    let app = app();
    let cookie = login(&app).await;
    let request = Request::put("/api/classes/3.4/text")
        .header(header::HOST, HOST)
        .header(header::ORIGIN, origin)
        .header(header::COOKIE, cookie);
    raw_api(
        &app,
        request,
        Some(("application/json", r#"{"read":true}"#.into())),
    )
    .await
    .0
}

// --- The UI -------------------------------------------------------------

#[tokio::test]
async fn serves_the_home_page_without_a_session() {
    let (status, headers, body) = open(&app(), "/").await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(headers[header::CONTENT_TYPE], "text/html");
    assert_eq!(body, "<h1>home</h1>");
}

#[tokio::test]
async fn unknown_pages_get_the_single_page_app_fallback() {
    let (status, _, body) = open(&app(), "/lesson/3.4").await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body, "<div id=spa></div>");
}

#[tokio::test]
async fn hashed_assets_are_cached_for_good() {
    let (status, headers, _) = open(&app(), "/assets/app-1234.js").await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(headers[header::CONTENT_TYPE], "text/javascript");
    assert!(
        headers[header::CACHE_CONTROL]
            .to_str()
            .unwrap()
            .contains("immutable")
    );
}

#[tokio::test]
async fn missing_files_are_404s_wherever_they_are() {
    for path in ["/assets/nope.js", "/fonts/zen.woff2", "/site.webmanifest"] {
        let (status, _, _) = open(&app(), path).await;
        assert_eq!(status, StatusCode::NOT_FOUND, "{path}");
    }
}

#[tokio::test]
async fn pages_cant_be_framed_or_sniffed() {
    let (_, headers, _) = open(&app(), "/").await;
    assert_eq!(headers[header::X_FRAME_OPTIONS], "DENY");
    assert_eq!(
        headers[header::CONTENT_SECURITY_POLICY],
        "frame-ancestors 'none'"
    );
    assert_eq!(headers[header::X_CONTENT_TYPE_OPTIONS], "nosniff");
}

// --- Keeping other websites out ----------------------------------------

#[tokio::test]
async fn rejects_requests_for_another_host_name() {
    // A DNS-rebinding page reaches 127.0.0.1 under its own name.
    let request = Request::get("/").header(header::HOST, "evil.example:7878");
    let (status, _, _) = send(&app(), request.body(Body::empty()).unwrap()).await;
    assert_eq!(status, StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn accepts_localhost_as_a_host_name() {
    let request = Request::get("/").header(header::HOST, "localhost:7878");
    let (status, _, _) = send(&app(), request.body(Body::empty()).unwrap()).await;
    assert_eq!(status, StatusCode::OK);
}

#[tokio::test]
async fn the_api_needs_a_session() {
    let (status, _, _) = open(&app(), "/api/progress").await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn the_launch_link_trades_the_token_for_a_separate_session_cookie() {
    let (status, headers, _) = open(&app(), &format!("/?token={TOKEN}")).await;
    assert_eq!(status, StatusCode::SEE_OTHER);
    assert_eq!(headers[header::LOCATION], "/");
    let cookie = headers[header::SET_COOKIE].to_str().unwrap();
    assert!(
        cookie.starts_with(&format!("{COOKIE_NAME}={SECRET};")),
        "{cookie}"
    );
    assert!(!cookie.contains(TOKEN));
    assert!(cookie.contains("HttpOnly"));
    assert!(cookie.contains("SameSite=Strict"));
}

#[tokio::test]
async fn the_launch_link_works_only_once() {
    let app = app();
    login(&app).await;
    let (status, headers, _) = open(&app, &format!("/?token={TOKEN}")).await;
    assert_eq!(status, StatusCode::OK);
    assert!(headers.get(header::SET_COOKIE).is_none());
}

#[tokio::test]
async fn keeps_the_next_unused_launch_link_in_the_launch_file() {
    let dir = tempfile::tempdir().unwrap();
    let file = dir.path().join("launch");
    let app = app_with(Config {
        launch_file: Some(file.clone()),
        ..config()
    });
    let first = Launch::read(&file).expect("written at start");
    assert_eq!(
        first,
        Launch {
            port: 7878,
            instance: INSTANCE.into(),
            token: TOKEN.into()
        }
    );

    login(&app).await;
    let next = Launch::read(&file).expect("replaced after use");
    assert_ne!(next.token, TOKEN);
    assert_eq!(next.token.len(), 32);
    assert_eq!(next.instance, INSTANCE);

    // The fresh link starts a session in another browser; the used one still doesn't.
    let (status, headers, _) = open(&app, &format!("/?token={}", next.token)).await;
    assert_eq!(status, StatusCode::SEE_OTHER);
    assert!(headers.get(header::SET_COOKIE).is_some());
    let (_, headers, _) = open(&app, &format!("/?token={TOKEN}")).await;
    assert!(headers.get(header::SET_COOKIE).is_none());
}

#[cfg(unix)]
#[tokio::test]
async fn the_launch_file_is_readable_by_its_owner_only() {
    use std::os::unix::fs::PermissionsExt;
    let dir = tempfile::tempdir().unwrap();
    let file = dir.path().join("launch");
    let app = app_with(Config {
        launch_file: Some(file.clone()),
        ..config()
    });
    login(&app).await;
    let mode = std::fs::metadata(&file).unwrap().permissions().mode();
    assert_eq!(mode & 0o777, 0o600);
}

#[tokio::test]
async fn health_names_the_running_oxido() {
    let (status, _, body) = open(&app(), "/api/health").await;
    assert_eq!(status, StatusCode::OK);
    let body: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(body["status"], "ok");
    assert_eq!(body["instance"], INSTANCE);
}

#[tokio::test]
async fn a_wrong_token_starts_no_session() {
    let (status, headers, _) = open(&app(), "/?token=guess").await;
    assert_eq!(status, StatusCode::OK);
    assert!(headers.get(header::SET_COOKIE).is_none());
}

#[tokio::test]
async fn the_launch_link_only_redirects_within_oxido() {
    let (_, headers, _) = open(&app(), &format!("//evil.example/x?token={TOKEN}")).await;
    assert_eq!(headers[header::LOCATION], "/");
}

#[tokio::test]
async fn the_token_itself_is_not_a_session() {
    let app = app();
    let request = get("/api/progress").header(header::COOKIE, format!("{COOKIE_NAME}={TOKEN}"));
    let (status, _, _) = send(&app, request.body(Body::empty()).unwrap()).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn refuses_writes_from_other_origins_even_with_a_session() {
    assert_eq!(
        write_from("http://evil.example").await,
        StatusCode::FORBIDDEN
    );
    // Other local servers are same-site, so they'd get the cookie; the origin
    // check is what stops them.
    assert_eq!(
        write_from("http://127.0.0.1:3000").await,
        StatusCode::FORBIDDEN
    );
    assert_eq!(write_from("null").await, StatusCode::FORBIDDEN);
    assert_eq!(write_from(ORIGIN).await, StatusCode::NO_CONTENT);
}

#[tokio::test]
async fn the_health_check_is_public() {
    let (status, _, body) = open(&app(), "/api/health").await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        serde_json::from_str::<Value>(&body).unwrap()["status"],
        "ok"
    );
}

// --- The API --------------------------------------------------------------

#[tokio::test]
async fn saves_and_returns_class_progress() {
    let client = client().await;
    let video = json!({"seconds": 391, "watched": true});
    let (status, _) = client
        .api("PUT", "/api/classes/3.4/video", Some(video))
        .await;
    assert_eq!(status, StatusCode::NO_CONTENT);
    let (status, _) = client
        .api("PUT", "/api/classes/3.4/text", Some(json!({"read": true})))
        .await;
    assert_eq!(status, StatusCode::NO_CONTENT);

    let (status, progress) = client.api("GET", "/api/progress", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(progress["classes"]["3.4"]["video_seconds"], 391);
    assert_eq!(progress["classes"]["3.4"]["video_watched"], true);
    assert_eq!(progress["classes"]["3.4"]["text_read"], true);
}

#[tokio::test]
async fn records_quiz_results() {
    let client = client().await;
    let body = json!({"correct": 7, "total": 10, "done": true});
    let (status, _) = client.api("PUT", "/api/quizzes/2", Some(body)).await;
    assert_eq!(status, StatusCode::NO_CONTENT);

    let (_, progress) = client.api("GET", "/api/progress", None).await;
    assert_eq!(progress["quizzes"]["2"]["best_correct"], 7);
    assert_eq!(progress["quizzes"]["2"]["done"], true);
}

#[tokio::test]
async fn manages_notes() {
    let client = client().await;
    let new = json!({"anchor": {"kind": "video", "seconds": 167}, "body": "needs a use line"});
    let (status, note) = client
        .api("POST", "/api/classes/3.4/notes", Some(new))
        .await;
    assert_eq!(status, StatusCode::CREATED);
    let id = note["id"].as_i64().unwrap();

    let (_, notes) = client.api("GET", "/api/classes/3.4/notes", None).await;
    assert_eq!(notes.as_array().unwrap().len(), 1);

    let path = format!("/api/notes/{id}");
    let edit = json!({"body": "use std::collections"});
    let (status, note) = client.api("PUT", &path, Some(edit)).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(note["body"], "use std::collections");

    let (status, _) = client.api("DELETE", &path, None).await;
    assert_eq!(status, StatusCode::NO_CONTENT);
    let (status, _) = client.api("DELETE", &path, None).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn invalid_input_is_a_400_with_a_message() {
    let client = client().await;
    let cases = [
        (
            "PUT",
            "/api/quizzes/2",
            json!({"correct": 11, "total": 10}),
            "score",
        ),
        ("PUT", "/api/classes/3.4/video", json!({}), "seconds"),
        (
            "PUT",
            "/api/classes/..%2F..%2Fx/video",
            json!({"seconds": 1}),
            "id",
        ),
        (
            "PUT",
            "/api/classes/3.4/text",
            json!({"read": "yes"}),
            "read",
        ),
    ];
    for (method, path, body, mentions) in cases {
        let (status, error) = client.api(method, path, Some(body)).await;
        assert_eq!(status, StatusCode::BAD_REQUEST, "{path}");
        let message = error["error"].as_str().unwrap_or_default();
        assert!(message.contains(mentions), "{path}: {message}");
    }
}

#[tokio::test]
async fn malformed_requests_still_get_a_json_error() {
    let client = client().await;
    let (status, error) = client
        .api("PUT", "/api/notes/abc", Some(json!({"body": "x"})))
        .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert!(error["error"].is_string());

    let request = Request::put("/api/classes/3.4/text")
        .header(header::HOST, HOST)
        .header(header::ORIGIN, ORIGIN)
        .header(header::COOKIE, &client.cookie);
    let (status, error) = raw_api(&client.app, request, Some(("text/plain", "read".into()))).await;
    assert_eq!(status, StatusCode::UNSUPPORTED_MEDIA_TYPE);
    assert!(error["error"].is_string());
}

#[tokio::test]
async fn unknown_api_routes_are_json_404s() {
    let (status, error) = client().await.api("GET", "/api/nope", None).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    assert!(error["error"].is_string());
}
