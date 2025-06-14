# 🐘 PostgreSQL Migration Guide

## Overview

The Lisa AI application has been successfully migrated from SQLite to PostgreSQL for improved performance, scalability, and production readiness.

## 🔄 What Changed

### Database Engine
- **Before**: SQLite (file-based database)
- **After**: PostgreSQL (full-featured relational database)

### Dependencies
- **Removed**: `sqlite3` package
- **Added**: `pg` (PostgreSQL driver) and `pg-pool` (connection pooling)

### Configuration
- **New**: PostgreSQL connection configuration in `.env`
- **New**: Database connection pooling for better performance
- **New**: Environment-based database configuration

## 🚀 Migration Benefits

### Performance Improvements
- **Connection Pooling**: Efficient database connection management
- **Concurrent Access**: Better handling of multiple simultaneous users
- **Query Optimization**: PostgreSQL's advanced query planner
- **Indexing**: Superior indexing capabilities for faster searches

### Production Readiness
- **ACID Compliance**: Full transaction support with rollback capabilities
- **Scalability**: Handles larger datasets and more concurrent users
- **Backup & Recovery**: Robust backup and point-in-time recovery
- **Monitoring**: Better logging and performance monitoring tools

### Security Enhancements
- **Parameterized Queries**: All queries use `$1, $2` parameters to prevent SQL injection
- **User Management**: Database-level user access controls
- **SSL Support**: Encrypted connections in production
- **Audit Logging**: Enhanced activity tracking

## 📋 Migration Checklist

### For New Installations

1. **Install PostgreSQL**
   ```bash
   # macOS
   brew install postgresql@15
   brew services start postgresql@15
   
   # Ubuntu/Debian
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

2. **Run Automated Setup**
   ```bash
   cd server/chatbot-backend/scripts
   ./setup-postgresql.sh
   ```

3. **Configure Environment**
   - Copy `env.example` to `.env`
   - Update database credentials
   - Add OpenAI API key

4. **Initialize Database**
   ```bash
   npm run init-db
   ```

### For Existing Installations (Data Migration)

1. **Backup Current Data**
   ```bash
   # Backup SQLite database
   cp server/chatbot-backend/database.sqlite database.sqlite.backup
   ```

2. **Set Up PostgreSQL**
   ```bash
   # Run PostgreSQL setup
   cd server/chatbot-backend/scripts
   ./setup-postgresql.sh
   ```

3. **Install New Dependencies**
   ```bash
   cd server/chatbot-backend
   npm install
   ```

4. **Migrate Data**
   ```bash
   # Ensure both databases are accessible
   npm run migrate-to-postgresql
   ```

5. **Update Configuration**
   ```bash
   # Update .env file with PostgreSQL settings
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=lisa_db
   DB_USER=lisa_user
   DB_PASSWORD=lisa_password
   ```

6. **Test Application**
   ```bash
   # Start the application and verify everything works
   npm start
   ```

7. **Remove SQLite (Optional)**
   ```bash
   # After confirming everything works
   rm server/chatbot-backend/database.sqlite
   ```

## 🔧 Configuration Details

### Environment Variables (.env)

```env
# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lisa_db
DB_USER=lisa_user
DB_PASSWORD=lisa_password

# Connection Pool Settings (optional - defaults provided)
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000
```

### Database Schema

The PostgreSQL schema includes all the same tables as SQLite with these improvements:

- **Serial Primary Keys**: Auto-incrementing IDs using `SERIAL`
- **Proper Data Types**: `TIMESTAMP` instead of `DATETIME`
- **Boolean Types**: Native `BOOLEAN` instead of integers
- **Foreign Keys**: Proper referential integrity with cascading deletes
- **Constraints**: Enhanced data validation and consistency

### Key Schema Changes

| SQLite | PostgreSQL | Change Reason |
|--------|------------|---------------|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` | PostgreSQL standard |
| `DATETIME` | `TIMESTAMP` | Native timestamp support |
| `BOOLEAN DEFAULT 1` | `BOOLEAN DEFAULT true` | Native boolean type |
| Foreign key references | `REFERENCES table(id) ON DELETE CASCADE` | Proper referential integrity |

## 🛠️ Code Changes

### Database Connection
- **New**: Connection pooling with automatic connection management
- **New**: Async/await pattern for all database operations
- **New**: Transaction support with rollback capabilities

### Query Updates
- **Before**: `db.run("SELECT * FROM users WHERE id = ?", [id])`
- **After**: `await query("SELECT * FROM users WHERE id = $1", [id])`

### Error Handling
- **Improved**: Better error messages and handling
- **New**: Transaction rollback on errors
- **Enhanced**: Connection cleanup and resource management

## 📊 Performance Improvements

### Before (SQLite)
- Single-threaded database access
- File locking for concurrent access
- Limited connection management
- Basic query optimization

### After (PostgreSQL)
- Multi-threaded concurrent access
- Connection pooling (20 connections)
- Advanced query optimization
- Better memory management
- Prepared statement caching

## 🔍 Monitoring & Maintenance

### Database Health Checks
```bash
# Check PostgreSQL status
pg_isready -d lisa_db -h localhost -p 5432

# View active connections
psql -d lisa_db -c "SELECT count(*) FROM pg_stat_activity;"

# Check database size
psql -d lisa_db -c "SELECT pg_size_pretty(pg_database_size('lisa_db'));"

# Query performance analysis
psql -d lisa_db -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

### Database Maintenance
```bash
# Analyze database statistics
psql -d lisa_db -c "ANALYZE;"

# Vacuum to reclaim space
psql -d lisa_db -c "VACUUM;"

# Full vacuum (for major cleanup)
psql -d lisa_db -c "VACUUM FULL;"
```

### Backup & Recovery
```bash
# Create backup
pg_dump lisa_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
psql lisa_db < backup_file.sql
```

## 🔐 Security

### User Management
```bash
# Change user password
sudo -u postgres psql
ALTER USER lisa_user PASSWORD 'new_secure_password';

# Grant specific permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO lisa_user;
```

### Connection Security
- Use SSL connections in production
- Configure `pg_hba.conf` for access control
- Use connection pooling to limit resource usage
- Regular security updates for PostgreSQL

## 📈 Performance Monitoring

### Key Metrics to Monitor
```bash
# Check database activity
psql -d lisa_db -c "SELECT count(*) FROM users;"

# Monitor active connections
psql -d lisa_db -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Query performance
psql -d lisa_db -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

### Optimization Tips
- Regular `ANALYZE` to update table statistics
- Use `EXPLAIN ANALYZE` to understand query performance
- Index frequently queried columns
- Monitor slow query log
- Configure shared_buffers appropriately

## 🎯 Troubleshooting

### Common Issues

1. **Connection Refused**
   ```bash
   # Check if PostgreSQL is running
   brew services list | grep postgresql  # macOS
   sudo systemctl status postgresql      # Linux
   ```

2. **Permission Denied**
   ```bash
   # Check user permissions
   psql postgres -c "\du"
   ```

3. **Database Not Found**
   ```bash
   # List databases
   psql postgres -c "\l"
   ```

4. **Port Already in Use**
   ```bash
   # Check what's using port 5432
   lsof -i :5432
   ```

### Performance Issues
- Check connection pool settings
- Monitor memory usage
- Review slow query log
- Ensure proper indexing

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js pg Driver](https://node-postgres.com/)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Database Security Best Practices](https://www.postgresql.org/docs/current/auth-pg-hba-conf.html)

---

**Migration completed successfully! Your Lisa AI application is now running on PostgreSQL.** 🎉 