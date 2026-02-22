import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface DatabaseConfig {
  type: 'mysql' | 'postgresql' | 'mssql';
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  connectionString?: string;
}

export interface QueryResult {
  rows: any[];
  rowCount: number;
  fields?: string[];
  duration: number;
}

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private configService: ConfigService) {}

  async testConnection(config: DatabaseConfig): Promise<{ success: boolean; message: string; version?: string }> {
    const startTime = Date.now();
    
    try {
      const connectionConfig = this.buildConnectionConfig(config);
      
      if (config.type === 'mysql') {
        return await this.testMySQLConnection(connectionConfig);
      } else if (config.type === 'postgresql') {
        return await this.testPostgreSQLConnection(connectionConfig);
      } else if (config.type === 'mssql') {
        return await this.testMSSQLConnection(connectionConfig);
      }
      
      return { success: false, message: `Unsupported database type: ${config.type}` };
    } catch (error: any) {
      this.logger.error(`Connection test failed: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  async executeQuery(config: DatabaseConfig, query: string): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      const connectionConfig = this.buildConnectionConfig(config);
      
      if (config.type === 'mysql') {
        return await this.executeMySQLQuery(connectionConfig, query);
      } else if (config.type === 'postgresql') {
        return await this.executePostgreSQLQuery(connectionConfig, query);
      } else if (config.type === 'mssql') {
        return await this.executeMSSQLQuery(connectionConfig, query);
      }
      
      throw new Error(`Unsupported database type: ${config.type}`);
    } catch (error: any) {
      this.logger.error(`Query execution failed: ${error.message}`);
      throw error;
    }
  }

  private buildConnectionConfig(config: DatabaseConfig): any {
    if (config.connectionString) {
      return { connectionString: config.connectionString };
    }
    
    return {
      host: config.host || 'localhost',
      port: config.port || this.getDefaultPort(config.type),
      database: config.database,
      user: config.username,
      password: config.password,
    };
  }

  private getDefaultPort(type: string): number {
    const ports: Record<string, number> = {
      mysql: 3306,
      postgresql: 5432,
      mssql: 1433,
    };
    return ports[type] || 3306;
  }

  private async testMySQLConnection(config: any): Promise<{ success: boolean; message: string; version?: string }> {
    try {
      const mysql = await import('mysql2/promise');
      const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        connectTimeout: 10000,
      });
      
      const [rows] = await connection.execute('SELECT VERSION() as version');
      await connection.end();
      
      const version = (rows as any[])[0]?.version;
      return { success: true, message: '连接成功', version };
    } catch (error: any) {
      return { success: false, message: `MySQL 连接失败: ${error.message}` };
    }
  }

  private async testPostgreSQLConnection(config: any): Promise<{ success: boolean; message: string; version?: string }> {
    try {
      const { Pool } = await import('pg');
      const pool = new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        connectionTimeoutMillis: 10000,
      });
      
      const result = await pool.query('SELECT version()');
      await pool.end();
      
      const version = result.rows[0]?.version?.split(' ')[1];
      return { success: true, message: '连接成功', version };
    } catch (error: any) {
      return { success: false, message: `PostgreSQL 连接失败: ${error.message}` };
    }
  }

  private async testMSSQLConnection(config: any): Promise<{ success: boolean; message: string; version?: string }> {
    try {
      const sql = await import('mssql');
      const connection = await sql.connect({
        server: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        options: {
          trustServerCertificate: true,
          connectTimeout: 10000,
        },
      });
      
      const result = await connection.query('SELECT @@VERSION as version');
      await connection.close();
      
      const version = result.recordset[0]?.version?.split('\n')[0];
      return { success: true, message: '连接成功', version };
    } catch (error: any) {
      return { success: false, message: `MSSQL 连接失败: ${error.message}` };
    }
  }

  private async executeMySQLQuery(config: any, query: string): Promise<QueryResult> {
    const mysql = await import('mysql2/promise');
    const startTime = Date.now();
    
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
    });
    
    try {
      const [rows, fields] = await connection.execute(query);
      const duration = Date.now() - startTime;
      
      return {
        rows: Array.isArray(rows) ? rows : [rows],
        rowCount: Array.isArray(rows) ? rows.length : 1,
        fields: fields?.map((f: any) => f.name),
        duration,
      };
    } finally {
      await connection.end();
    }
  }

  private async executePostgreSQLQuery(config: any, query: string): Promise<QueryResult> {
    const { Pool } = await import('pg');
    const startTime = Date.now();
    
    const pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
    });
    
    try {
      const result = await pool.query(query);
      const duration = Date.now() - startTime;
      
      return {
        rows: result.rows,
        rowCount: result.rowCount || result.rows.length,
        fields: result.fields?.map((f: any) => f.name),
        duration,
      };
    } finally {
      await pool.end();
    }
  }

  private async executeMSSQLQuery(config: any, query: string): Promise<QueryResult> {
    const sql = await import('mssql');
    const startTime = Date.now();
    
    const connection = await sql.connect({
      server: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      options: {
        trustServerCertificate: true,
      },
    });
    
    try {
      const result = await connection.query(query);
      const duration = Date.now() - startTime;
      
      return {
        rows: result.recordset,
        rowCount: result.rowsAffected[0] || result.recordset.length,
        fields: result.recordset?.length > 0 ? Object.keys(result.recordset[0]) : [],
        duration,
      };
    } finally {
      await connection.close();
    }
  }
}
