//! The launch file, `<project>/.oxido/launch`: the next unused launch link of
//! the `oxido` running in that project. Each launch link works once; after it's
//! used the server replaces it here, so there's always one ready. A second
//! `oxido` started in the same project finds it, checks that the server that
//! wrote it still answers, and opens the browser instead of failing on a busy
//! port.
//!
//! The file holds a working launch token, so only its owner can read it (0600
//! on Unix). Anything running as the same user can already read the progress
//! database itself, so it grants nothing new.

use std::io::{Read, Write};
use std::net::{Ipv4Addr, SocketAddr, TcpStream};
use std::path::{Path, PathBuf};
use std::time::Duration;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Launch {
    pub port: u16,
    /// Random per run of `oxido`, reported by `/api/health`, so a stale file
    /// never points at a different `oxido` that took the same port.
    pub instance: String,
    pub token: String,
}

/// Where a project keeps its launch file.
pub fn path(project: &Path) -> PathBuf {
    project.join(".oxido").join("launch")
}

impl Launch {
    pub fn url(&self) -> String {
        format!("http://127.0.0.1:{}/?token={}", self.port, self.token)
    }

    /// Replaces the file in one step, readable by its owner only.
    pub fn write(&self, path: &Path) -> std::io::Result<()> {
        let json = serde_json::to_vec(self).map_err(std::io::Error::other)?;
        let temp = path.with_extension("tmp");
        let mut options = std::fs::OpenOptions::new();
        options.write(true).create(true).truncate(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        let mut file = options.open(&temp)?;
        file.write_all(&json)?;
        file.sync_all()?;
        drop(file);
        std::fs::rename(&temp, path)
    }

    /// The file's contents, or `None` if it's missing or damaged.
    pub fn read(path: &Path) -> Option<Self> {
        serde_json::from_slice(&std::fs::read(path).ok()?).ok()
    }

    /// Whether the `oxido` that wrote this still answers on its port. Asks its
    /// `/api/health` and compares the instance. Blocks for at most a second or so.
    pub fn is_running(&self) -> bool {
        health(self.port).is_some_and(|health| health.instance == self.instance)
    }
}

/// What an `oxido`'s `/api/health` reports. The route needs no session.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct Health {
    pub version: String,
    pub instance: String,
}

/// Asks `127.0.0.1:port` for `/api/health`. `None` if nothing answers there,
/// or what answers isn't an `oxido`. Blocks for at most a second or so.
pub fn health(port: u16) -> Option<Health> {
    let address = SocketAddr::from((Ipv4Addr::LOCALHOST, port));
    let mut stream = TcpStream::connect_timeout(&address, Duration::from_millis(500)).ok()?;
    stream.set_read_timeout(Some(Duration::from_secs(1))).ok()?;
    stream
        .set_write_timeout(Some(Duration::from_secs(1)))
        .ok()?;
    let request =
        format!("GET /api/health HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nConnection: close\r\n\r\n");
    stream.write_all(request.as_bytes()).ok()?;
    let mut response = Vec::new();
    stream.take(64 * 1024).read_to_end(&mut response).ok()?;
    let response = String::from_utf8_lossy(&response);
    let (head, body) = response.split_once("\r\n\r\n")?;
    if !head.starts_with("HTTP/1.1 200") {
        return None;
    }
    serde_json::from_str(body).ok()
}
