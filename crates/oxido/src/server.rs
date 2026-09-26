//! The local HTTP server: the UI, the JSON API, and the checks that keep other
//! websites out.
//!
//! A server on 127.0.0.1 can still be reached by any page open in the student's
//! browser, so every request goes through these checks:
//!
//! 1. **Host**: must be `127.0.0.1:<port>` or `localhost:<port>`. This stops
//!    DNS-rebinding pages, which reach 127.0.0.1 under their own domain name.
//! 2. **Session** (for `/api`): the terminal prints a launch link with a random
//!    token. Opening it once sets an `HttpOnly`, `SameSite=Strict` cookie holding
//!    a separate session secret, then the token stops working and a new one takes
//!    its place in the launch file (owner-only, see `launch`), so a second `oxido`
//!    in the project can reopen the browser. Sites on other domains never get the
//!    cookie. Pages served from *other ports* on 127.0.0.1 count as the same site
//!    and do get it, so:
//! 3. **Origin**: writes must come from oxido's own origin (a browser always sends
//!    `Origin` on cross-origin writes), and no CORS headers are ever sent, so
//!    other origins can't read API responses either.
//! 4. **Framing**: pages can't be put in a frame (no clickjacking).

use std::path::PathBuf;
use std::sync::{Arc, Mutex, MutexGuard};

use axum::Router;
use axum::body::Body;
use axum::extract::rejection::{JsonRejection, PathRejection};
use axum::extract::{Json, Path, Request, State};
use axum::http::{HeaderMap, HeaderValue, Method, StatusCode, Uri, header};
use axum::middleware::{self, Next};
use axum::response::{IntoResponse, Redirect, Response};
use axum::routing::{get, put};
use serde::Deserialize;
use serde_json::json;

use crate::launch::Launch;
use crate::store::{Anchor, NewNote, Store, StoreError};
use crate::ui::{Asset, AssetSource};

const SPA_FALLBACK: &str = "__spa-fallback.html";
/// Long enough to survive browser restarts; the secret changes every time
/// `oxido` starts, which ends old sessions anyway.
const SESSION_MAX_AGE_SECS: u32 = 30 * 24 * 60 * 60;

pub struct Config {
    /// The first launch link's token, printed in the terminal. Each launch
    /// token works once; the next one goes to the launch file.
    pub launch_token: String,
    /// What the session cookie holds. Never printed.
    pub session_secret: String,
    pub port: u16,
    /// Extra origins allowed to write, e.g. Vite's dev server.
    pub extra_origins: Vec<String>,
    /// Random per run; `/api/health` reports it so a second `oxido` knows it
    /// found this one.
    pub instance: String,
    /// Where to keep the next unused launch link (`<project>/.oxido/launch`).
    pub launch_file: Option<PathBuf>,
}

#[derive(Clone)]
pub struct AppState {
    inner: Arc<Inner>,
}

struct Inner {
    store: Mutex<Store>,
    /// The launch token that works now; each use replaces it. `None` once no
    /// new token could be made.
    launch_token: Mutex<Option<String>>,
    launch_file: Option<PathBuf>,
    instance: String,
    port: u16,
    session_secret: String,
    cookie_name: String,
    hosts: Vec<String>,
    origins: Vec<String>,
    assets: Box<dyn AssetSource>,
}

impl AppState {
    pub fn new(store: Store, config: Config, assets: impl AssetSource) -> Self {
        let port = config.port;
        let hosts = vec![format!("127.0.0.1:{port}"), format!("localhost:{port}")];
        let mut origins: Vec<String> = hosts.iter().map(|host| format!("http://{host}")).collect();
        origins.extend(config.extra_origins);
        let state = Self {
            inner: Arc::new(Inner {
                store: Mutex::new(store),
                launch_token: Mutex::new(Some(config.launch_token.clone())),
                launch_file: config.launch_file,
                instance: config.instance,
                port,
                session_secret: config.session_secret,
                // Cookies aren't scoped by port, so two oxido instances need two names.
                cookie_name: format!("oxido_session_{port}"),
                hosts,
                origins,
                assets: Box::new(assets),
            }),
        };
        state.keep_launch_file(Some(config.launch_token));
        state
    }

    /// Writes the working launch token to the launch file, or removes the file
    /// when there's none. Failing to write only costs the second-run shortcut.
    fn keep_launch_file(&self, token: Option<String>) {
        let Some(path) = &self.inner.launch_file else {
            return;
        };
        let result = match token {
            Some(token) => Launch {
                port: self.inner.port,
                instance: self.inner.instance.clone(),
                token,
            }
            .write(path),
            None => std::fs::remove_file(path),
        };
        if let Err(error) = result {
            tracing::warn!("couldn't update {}: {error}", path.display());
        }
    }

    fn store(&self) -> MutexGuard<'_, Store> {
        // Store calls are single statements or transactions, so a panic in
        // another request can't leave the database half-written.
        self.inner
            .store
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

pub fn router(state: AppState) -> Router {
    let api = Router::new()
        .route("/progress", get(progress))
        .route("/classes/{id}/video", put(save_video))
        .route("/classes/{id}/text", put(save_text))
        .route("/classes/{id}/notes", get(list_notes).post(add_note))
        .route("/notes/{id}", put(update_note).delete(delete_note))
        .route("/quizzes/{id}", put(save_quiz))
        .route_layer(middleware::from_fn_with_state(
            state.clone(),
            require_session,
        ))
        .fallback(|| async { error(StatusCode::NOT_FOUND, "no such API route") });

    Router::new()
        .route("/api/health", get(health))
        .nest("/api", api)
        .fallback(serve_ui)
        .layer(middleware::from_fn(security_headers))
        .layer(middleware::from_fn_with_state(state.clone(), check_host))
        .with_state(state)
}

// --- Checks -------------------------------------------------------------------

async fn check_host(State(state): State<AppState>, request: Request, next: Next) -> Response {
    let host = request
        .headers()
        .get(header::HOST)
        .and_then(|h| h.to_str().ok());
    match host {
        Some(host) if state.inner.hosts.iter().any(|allowed| allowed == host) => {
            next.run(request).await
        }
        _ => (
            StatusCode::FORBIDDEN,
            "oxido only answers on 127.0.0.1 and localhost",
        )
            .into_response(),
    }
}

async fn security_headers(request: Request, next: Next) -> Response {
    let mut response = next.run(request).await;
    let headers = response.headers_mut();
    headers.insert(header::X_FRAME_OPTIONS, HeaderValue::from_static("DENY"));
    headers.insert(
        header::CONTENT_SECURITY_POLICY,
        HeaderValue::from_static("frame-ancestors 'none'"),
    );
    headers.insert(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    );
    response
}

async fn require_session(State(state): State<AppState>, request: Request, next: Next) -> Response {
    if !has_session(&state, request.headers()) {
        return error(
            StatusCode::UNAUTHORIZED,
            "open the link oxido printed in your terminal",
        );
    }
    let writes = !matches!(*request.method(), Method::GET | Method::HEAD);
    if writes {
        let origin = request
            .headers()
            .get(header::ORIGIN)
            .and_then(|o| o.to_str().ok());
        if let Some(origin) = origin
            && !state.inner.origins.iter().any(|allowed| allowed == origin)
        {
            return error(
                StatusCode::FORBIDDEN,
                "writes are only accepted from oxido's own page",
            );
        }
    }
    next.run(request).await
}

fn has_session(state: &AppState, headers: &HeaderMap) -> bool {
    headers
        .get_all(header::COOKIE)
        .iter()
        .filter_map(|value| value.to_str().ok())
        .flat_map(|value| value.split(';'))
        .filter_map(|pair| pair.trim().split_once('='))
        .any(|(name, value)| {
            name == state.inner.cookie_name && same(value, &state.inner.session_secret)
        })
}

/// Compares without stopping at the first difference, so timing doesn't leak
/// how much of a guessed secret was right.
fn same(a: &str, b: &str) -> bool {
    a.len() == b.len()
        && a.bytes()
            .zip(b.bytes())
            .fold(0u8, |acc, (x, y)| acc | (x ^ y))
            == 0
}

// --- The UI ---------------------------------------------------------------------

async fn serve_ui(State(state): State<AppState>, uri: Uri) -> Response {
    if let Some(token) = query_param(&uri, "token")
        && let Some(response) = start_session(&state, &uri, token)
    {
        return response;
    }

    let path = uri.path().trim_start_matches('/');
    let assets = &state.inner.assets;
    let file = if path.is_empty() { "index.html" } else { path };

    if let Some(asset) = assets.get(file) {
        return asset_response(file, asset);
    }
    // Pre-rendered pages live at <path>/index.html.
    let page = format!("{}/index.html", file.trim_end_matches('/'));
    if let Some(asset) = assets.get(&page) {
        return asset_response(&page, asset);
    }
    // Missing files are 404s; any other path is a route the app handles itself.
    if !looks_like_file(file)
        && let Some(asset) = assets
            .get(SPA_FALLBACK)
            .or_else(|| assets.get("index.html"))
    {
        return asset_response(SPA_FALLBACK, asset);
    }
    (StatusCode::NOT_FOUND, "not found").into_response()
}

/// The launch link: the first valid use sets the session cookie and redirects
/// to the same page without the token. Later uses, and wrong tokens, do nothing.
fn start_session(state: &AppState, uri: &Uri, token: &str) -> Option<Response> {
    {
        let mut current = state
            .inner
            .launch_token
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        if !current
            .as_deref()
            .is_some_and(|expected| same(token, expected))
        {
            tracing::warn!("ignored a launch link that's wrong or already used");
            return None;
        }
        // This link is used up. Its replacement goes to the launch file, where a
        // second `oxido` in the project picks it up to reopen the browser.
        *current = crate::random_token()
            .inspect_err(|error| tracing::warn!("no new launch link: {error}"))
            .ok();
        state.keep_launch_file(current.clone());
    }
    let cookie = format!(
        "{}={}; HttpOnly; SameSite=Strict; Path=/; Max-Age={SESSION_MAX_AGE_SECS}",
        state.inner.cookie_name, state.inner.session_secret
    );
    // Only ever redirect within oxido: "//evil.example" would leave the site.
    let path = uri.path();
    let target = if path.starts_with('/') && !path.starts_with("//") {
        path
    } else {
        "/"
    };
    let mut response = Redirect::to(target).into_response();
    response
        .headers_mut()
        .insert(header::SET_COOKIE, HeaderValue::from_str(&cookie).ok()?);
    Some(response)
}

/// `assets/app.js`, `favicon.png` and `zen.woff2` are files; `lesson/3.4` is a
/// route (class ids contain dots), so an extension must start with a letter.
fn looks_like_file(path: &str) -> bool {
    let name = path.rsplit('/').next().unwrap_or(path);
    let extension = name.rsplit_once('.').map(|(_, ext)| ext);
    path.starts_with("assets/")
        || extension.is_some_and(|ext| {
            ext.starts_with(|c: char| c.is_ascii_alphabetic())
                && ext.len() <= 16
                && ext.chars().all(|c| c.is_ascii_alphanumeric())
        })
}

fn asset_response(path: &str, asset: Asset) -> Response {
    // Vite puts a content hash in every file name under assets/, so those can be
    // cached forever. Pages must be revalidated to pick up new builds.
    let cache = if path.starts_with("assets/") {
        "public, max-age=31536000, immutable"
    } else {
        "no-cache"
    };
    (
        [
            (header::CONTENT_TYPE, asset.mime),
            (header::CACHE_CONTROL, cache.to_string()),
        ],
        Body::from(asset.bytes.into_owned()),
    )
        .into_response()
}

fn query_param<'a>(uri: &'a Uri, name: &str) -> Option<&'a str> {
    uri.query()?
        .split('&')
        .filter_map(|pair| pair.split_once('='))
        .find_map(|(key, value)| (key == name).then_some(value))
}

// --- The API ----------------------------------------------------------------------

/// An error answer: a status and a message, sent as `{"error": "..."}`.
struct ApiError(StatusCode, String);

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        error(self.0, &self.1)
    }
}

impl From<StoreError> for ApiError {
    fn from(e: StoreError) -> Self {
        match e {
            StoreError::Invalid(message) => Self(StatusCode::BAD_REQUEST, message),
            StoreError::NoteNotFound(_) => Self(StatusCode::NOT_FOUND, e.to_string()),
            other => {
                tracing::error!("{other}");
                Self(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "oxido couldn't read or save your progress".into(),
                )
            }
        }
    }
}

type ApiResult = Result<Response, ApiError>;

/// Request bodies and path values that don't parse still get a JSON error.
type JsonInput<T> = Result<Json<T>, JsonRejection>;
type PathInput<T> = Result<Path<T>, PathRejection>;

fn body<T>(input: JsonInput<T>) -> Result<T, ApiError> {
    input.map(|Json(value)| value).map_err(|rejection| {
        // A missing or wrong content type stays 415; everything else is a 400.
        let status = match rejection.status() {
            StatusCode::UNSUPPORTED_MEDIA_TYPE => StatusCode::UNSUPPORTED_MEDIA_TYPE,
            _ => StatusCode::BAD_REQUEST,
        };
        ApiError(status, rejection.body_text())
    })
}

fn path<T>(input: PathInput<T>) -> Result<T, ApiError> {
    input
        .map(|Path(value)| value)
        .map_err(|rejection| ApiError(StatusCode::BAD_REQUEST, rejection.body_text()))
}

fn no_content() -> ApiResult {
    Ok(StatusCode::NO_CONTENT.into_response())
}

async fn health(State(state): State<AppState>) -> Response {
    Json(json!({
        "status": "ok",
        "version": env!("CARGO_PKG_VERSION"),
        "instance": state.inner.instance,
    }))
    .into_response()
}

async fn progress(State(state): State<AppState>) -> ApiResult {
    Ok(Json(state.store().progress()?).into_response())
}

#[derive(Deserialize)]
struct VideoUpdate {
    seconds: Option<u32>,
    #[serde(default)]
    watched: bool,
}

async fn save_video(
    State(state): State<AppState>,
    id: PathInput<String>,
    update: JsonInput<VideoUpdate>,
) -> ApiResult {
    let (id, update) = (path(id)?, body(update)?);
    state
        .store()
        .update_video(&id, update.seconds, update.watched)?;
    no_content()
}

#[derive(Deserialize)]
struct TextUpdate {
    read: bool,
}

async fn save_text(
    State(state): State<AppState>,
    id: PathInput<String>,
    update: JsonInput<TextUpdate>,
) -> ApiResult {
    let (id, update) = (path(id)?, body(update)?);
    state.store().set_text_read(&id, update.read)?;
    no_content()
}

#[derive(Deserialize)]
struct QuizUpdate {
    correct: Option<u32>,
    total: Option<u32>,
    #[serde(default)]
    done: bool,
}

async fn save_quiz(
    State(state): State<AppState>,
    id: PathInput<String>,
    update: JsonInput<QuizUpdate>,
) -> ApiResult {
    let (id, update) = (path(id)?, body(update)?);
    let score = match (update.correct, update.total) {
        (Some(correct), Some(total)) => Some((correct, total)),
        (None, None) => None,
        _ => {
            return Err(ApiError(
                StatusCode::BAD_REQUEST,
                "send both correct and total for a quiz score".into(),
            ));
        }
    };
    state.store().update_quiz(&id, score, update.done)?;
    no_content()
}

async fn list_notes(State(state): State<AppState>, id: PathInput<String>) -> ApiResult {
    let id = path(id)?;
    Ok(Json(state.store().notes(&id)?).into_response())
}

#[derive(Deserialize)]
struct NoteInput {
    anchor: Anchor,
    body: String,
}

async fn add_note(
    State(state): State<AppState>,
    class_id: PathInput<String>,
    input: JsonInput<NoteInput>,
) -> ApiResult {
    let (class_id, input) = (path(class_id)?, body(input)?);
    let note = state.store().add_note(NewNote {
        class_id,
        anchor: input.anchor,
        body: input.body,
    })?;
    Ok((StatusCode::CREATED, Json(note)).into_response())
}

#[derive(Deserialize)]
struct NoteEdit {
    body: String,
}

async fn update_note(
    State(state): State<AppState>,
    id: PathInput<i64>,
    edit: JsonInput<NoteEdit>,
) -> ApiResult {
    let (id, edit) = (path(id)?, body(edit)?);
    Ok(Json(state.store().update_note(id, &edit.body)?).into_response())
}

async fn delete_note(State(state): State<AppState>, id: PathInput<i64>) -> ApiResult {
    state.store().delete_note(path(id)?)?;
    no_content()
}

fn error(status: StatusCode, message: &str) -> Response {
    (status, Json(json!({ "error": message }))).into_response()
}
