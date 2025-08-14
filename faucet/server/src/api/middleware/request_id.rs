use axum::http::header::{HeaderName, HeaderValue};
use axum::{extract::Request, response::Response};
use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};
use tower::Layer;
use uuid::Uuid;

static X_REQUEST_ID: &str = "x-request-id";

#[derive(Clone, Debug)]
pub struct RequestIdLayer;

impl RequestIdLayer {
    pub fn new() -> Self {
        Self
    }
}

impl<S> Layer<S> for RequestIdLayer {
    type Service = RequestIdMiddleware<S>;

    fn layer(&self, inner: S) -> Self::Service {
        RequestIdMiddleware { inner }
    }
}

#[derive(Clone)]
pub struct RequestIdMiddleware<S> {
    inner: S,
}

impl<S> tower::Service<Request> for RequestIdMiddleware<S>
where
    S: tower::Service<Request, Response = Response> + Clone + Send + 'static,
    S::Future: Send + 'static,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, mut request: Request) -> Self::Future {
        let request_id = Uuid::new_v4().to_string();

        let header_name = HeaderName::from_static(X_REQUEST_ID);
        let header_value = match HeaderValue::from_str(&request_id) {
            Ok(val) => val,
            Err(_) => {
                let mut inner = self.inner.clone();
                return Box::pin(async move { inner.call(request).await });
            }
        };

        request
            .headers_mut()
            .insert(header_name.clone(), header_value.clone());

        let mut inner = self.inner.clone();

        Box::pin(async move {
            let mut response = inner.call(request).await?;
            response.headers_mut().insert(header_name, header_value);
            Ok(response)
        })
    }
}
