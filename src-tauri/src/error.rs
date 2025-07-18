#[derive(thiserror::Error)]
pub enum CommonError {
    #[error(transparent)]
    UnexpectedError(#[from] anyhow::Error),
    #[error("Database error: {0}")]
    DatabaseError(#[from] sea_orm::DbErr),
}

impl From<CommonError> for String {
    fn from(err: CommonError) -> String {
        err.to_string()
    }
}

impl std::fmt::Debug for CommonError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        error_chain_fmt(self, f)
    }
}

pub fn error_chain_fmt(
    e: &impl std::error::Error,
    f: &mut std::fmt::Formatter<'_>,
) -> std::fmt::Result {
    writeln!(f, "{}\n", e)?;
    let mut current = e.source();
    while let Some(cause) = current {
        writeln!(f, "Caused by:\n\t{}", cause)?;
        current = cause.source();
    }
    Ok(())
}
