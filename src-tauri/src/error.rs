
#[derive(thiserror::Error, Debug)]
pub enum CommonError {
    #[error(transparent)]
    UnexpectedError(#[from] anyhow::Error),
}