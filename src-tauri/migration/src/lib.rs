pub use sea_orm_migration::prelude::*;

mod m20220101_000001_create_table;
mod m20241220_000002_add_token_field;
mod m20241220_000003_add_refresh_token_field;
mod m20250917_000001_update_msg_table;
mod m20250917_000002_add_thumbnail_path;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20220101_000001_create_table::Migration),
            Box::new(m20241220_000002_add_token_field::Migration),
            Box::new(m20241220_000003_add_refresh_token_field::Migration),
            Box::new(m20250917_000001_update_msg_table::Migration),
            Box::new(m20250917_000002_add_thumbnail_path::Migration),
        ]
    }
}
