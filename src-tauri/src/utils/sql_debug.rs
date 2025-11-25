use sea_orm::{DatabaseBackend, Statement};
use tracing::info;

/// SQL调试工具函数
pub struct SqlDebug;

impl SqlDebug {
    /// 打印SQL语句和参数
    pub fn log_query<T>(query: &T, backend: DatabaseBackend, label: &str)
    where
        T: sea_orm::QueryTrait,
    {
        let statement = query.build(backend);

        info!("[{}] SQL: {}", label, statement.sql);
        if let Some(ref values) = statement.values {
            info!("[{}] Parameters: {:?}", label, values);

            // 打印格式化的完整SQL（参数已替换）
            let formatted_sql = Self::format_sql_with_values(&statement.sql, values);
            info!("[{}] Complete SQL: {}", label, formatted_sql);
        } else {
            info!("[{}] Complete SQL: {}", label, statement.sql);
        }
    }

    /// 打印Statement
    pub fn log_statement(statement: &Statement, label: &str) {
        info!("[{}] SQL: {}", label, statement.sql);
        if let Some(ref values) = statement.values {
            info!("[{}] Parameters: {:?}", label, values);

            let formatted_sql = Self::format_sql_with_values(&statement.sql, values);
            info!("[{}] Complete SQL: {}", label, formatted_sql);
        } else {
            info!("[{}] Complete SQL: {}", label, statement.sql);
        }
    }

    /// 将SQL参数替换到SQL语句中
    fn format_sql_with_values(sql: &str, values: &sea_orm::Values) -> String {
        let mut formatted_sql = sql.to_string();

        for value in values.0.iter() {
            let value_str = match value {
                sea_orm::Value::TinyInt(Some(v)) => v.to_string(),
                sea_orm::Value::SmallInt(Some(v)) => v.to_string(),
                sea_orm::Value::Int(Some(v)) => v.to_string(),
                sea_orm::Value::BigInt(Some(v)) => v.to_string(),
                sea_orm::Value::TinyUnsigned(Some(v)) => v.to_string(),
                sea_orm::Value::SmallUnsigned(Some(v)) => v.to_string(),
                sea_orm::Value::Unsigned(Some(v)) => v.to_string(),
                sea_orm::Value::BigUnsigned(Some(v)) => v.to_string(),
                sea_orm::Value::Float(Some(v)) => v.to_string(),
                sea_orm::Value::Double(Some(v)) => v.to_string(),
                sea_orm::Value::String(Some(v)) => format!("'{}'", v.replace("'", "''")),
                sea_orm::Value::Char(Some(v)) => format!("'{}'", v),
                sea_orm::Value::Bytes(Some(v)) => format!("'{}'", String::from_utf8_lossy(v)),
                sea_orm::Value::Bool(Some(v)) => {
                    if *v {
                        "1".to_string()
                    } else {
                        "0".to_string()
                    }
                }
                sea_orm::Value::Json(Some(v)) => format!("'{}'", v.to_string().replace("'", "''")),
                _ => "NULL".to_string(),
            };

            if let Some(pos) = formatted_sql.find('?') {
                formatted_sql.replace_range(pos..pos + 1, &value_str);
            }
        }

        formatted_sql
    }

    /// 简化的SQL日志记录
    pub fn log_simple(sql: &str, values: Option<&sea_orm::Values>, label: &str) {
        info!("[{}] {}", label, sql);
        if let Some(values) = values {
            if !values.0.is_empty() {
                info!("[{}] Parameters: {:?}", label, values);
            }
        }
    }
}

/// 便捷宏，用于快速打印SQL
#[macro_export]
macro_rules! log_sql {
    ($query:expr, $label:expr) => {
        $crate::utils::sql_debug::SqlDebug::log_query(
            &$query,
            sea_orm::DatabaseBackend::Sqlite,
            $label,
        );
    };
    ($query:expr, $backend:expr, $label:expr) => {
        $crate::utils::sql_debug::SqlDebug::log_query(&$query, $backend, $label);
    };
}
