import fs, { existsSync } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable, Transform } from 'stream';
import pg from 'pg';
import QueryStream from 'pg-query-stream';

import { from as copyFrom } from 'pg-copy-streams';
import { mkdir } from 'fs/promises';


let pool = null;

export function init({
  user,
  password,
  host,
  port,
  database,
  ssl,
}){

  pool = new pg.Pool({
    user,
    password,
    host,
    port,
    database,
    ssl,
  });
}

export async function loadPK(tableName,rowCount){

    if(!pool){
      throw Error(`pool is not created`);
    }

    const client = await pool.connect();
    const dir = `./output/pk`
    const file = `${tableName}_pk.txt`
    const output= `${dir}/${file}`;
    

    await mkdir(dir,{recursive : true});


    try {  

      await client.query(`CREATE EXTENSION IF NOT EXISTS tsm_system_rows;`);

      const queryStream = new QueryStream(`
          SELECT id 
          FROM ${tableName}
          TABLESAMPLE SYSTEM_ROWS ($1);
      `,[rowCount]);
      const dbStream = client.query(queryStream);
  
      const transformToString = new Transform({
        objectMode: true, // 객체 데이터를 받기 위해 필수 설정
        transform(row, encoding, callback) {
          this.push(`${row.id}\n`);
          callback();
        }
      });
      const writeStream = fs.createWriteStream(output, { encoding: 'utf8' });
      console.log('success stream creation');
  
      await pipeline(
        dbStream,
        transformToString,
        writeStream
      );
  
      console.log(`${output} file is created.`);
  
    } catch (error) {
      console.error('작업 중 에러 발생:', error);
    } finally {
      // 9. 사용한 자원(클라이언트 및 풀)을 반드시 해제
      await client.release();
    }

}

export async function createUUIDTable(tableName){

  if(!pool){
    throw Error(`pool is not created`);
  }
  const client = await pool.connect();

    try{
        await client.query(`
            DROP TABLE IF EXISTS ${tableName};
            CREATE TABLE ${tableName} (
                    id UUID PRIMARY KEY,
                    val INTEGER NOT NULL
                );
            `
        );
  
    } catch (error) {
      console.error('작업 중 에러 발생:', error);
    } 
    finally{
      await client.release()
    }

}

export async function createIntegerTable(tableName){

  if(!pool){
    throw Error(`pool is not created`);
  }
  const client = await pool.connect();

    try{
        await client.query(`
            DROP TABLE IF EXISTS ${tableName};
            CREATE TABLE ${tableName} (
                    id INTEGER PRIMARY KEY,
                    val INTEGER NOT NULL
                );
            `)
  
    } catch (error) {
      console.error('작업 중 에러 발생:', error);
    } 
    finally{
      await client.release()
    }

}

export async function insertRows(tableName,pkFunc,count){

    if(!pool){
      throw Error(`pool is not created`);
    }


    const client = await pool.connect();
    let cnt = 0;
    const dataStream = new Readable({
        read(){

            while(cnt < count){
                const row = `${pkFunc()}\t${cnt}\n`;
                cnt++;
                
                if(!this.push(row)) return;
            }

            this.push(null);
        }
    });

    const copyStream = client.query(copyFrom(`COPY ${tableName} FROM STDIN`));
    try{
        await pipeline(dataStream,copyStream);
        
    }catch(error){
        console.error('작업 중 에러 발생:', error);
    }
    finally{
        await client.release()
    }
}

export async function close(){
    if(!pool){
      throw Error(`pool is not created`);
    }
    await pool.end();
}

export async function resetPGStatStatements(){

  if(!pool){
    throw Error(`pool is not created`);
  }

  const client = await pool.connect();

  try{
  await client.query('SELECT pg_stat_statements_reset();');
  }
  catch(error){
    console.error('작업 중 에러 발생:', error);
  }
  finally{
      await client.release()
  }
}

export async function inspectIndex(tableName){

  if(!pool){
    throw Error(`pool is not created`);
  }

  const client = await pool.connect();

  try{
    const res = await client.query(
      `
        SELECT 
        t.schemaname AS schema_name,
        t.tablename AS table_name,
        t.indexname AS index_name,
        stat.*
        FROM (
            SELECT schemaname, tablename, indexname, indexname::regclass AS index_oid
            FROM pg_indexes
            WHERE tablename = '${tableName}'
        ) t
        CROSS JOIN LATERAL pgstatindex(t.index_oid) stat;  
      `
    ,);

    return res.rows[0];
  }  
  catch(error){
    console.error('작업 중 에러 발생:', error);
  }
  finally{
      await client.release()
  }
}

export async function inspectTableIO(tableName){

  if(!pool){
    throw Error(`pool is not created`);
  }

  const client = await pool.connect();

  try{
    const res = await client.query(
      `
      SELECT 
          relname AS table_name,
          heap_blks_read AS table_io_read,    -- 디스크에서 읽은 테이블 블록
          heap_blks_hit AS table_hit,
          idx_blks_read  AS index_io_read,    -- 디스크에서 읽은 테이블 블록
          idx_blks_hit AS index_io_hit,      -- 디스크에서 읽은 인덱스 블록
          ROUND(100.0 * (heap_blks_hit) / NULLIF( heap_blks_hit+ heap_blks_read, 0), 2) AS heap_hit_ratio,
          ROUND(100.0 * (idx_blks_hit) / NULLIF(idx_blks_read  + idx_blks_hit , 0), 2) AS idx_hit_ratio,
          ROUND(100.0 * (idx_blks_hit + heap_blks_hit) / NULLIF(idx_blks_read  + idx_blks_hit + heap_blks_hit+ heap_blks_read, 0), 2) AS tot_hit_ratio
      FROM pg_statio_all_tables
      WHERE 
          relname = '${tableName}'
      ORDER BY heap_blks_read DESC; 
      `
    );

    return res.rows[0];
  }  
  catch(error){
    console.error('작업 중 에러 발생:', error);
  }
  finally{
      await client.release()
  }
}

export async function inspectTable(tableName){
  if(!pool){
    throw Error(`pool is not created`);
  }

  const client = await pool.connect();

  try{
    const res = await client.query(
      `
      SELECT 
          schemaname AS schema,
          relname AS table_name,
          seq_scan,                -- 풀 스캔(Full Table Scan)이 발생한 횟수
          seq_tup_read,            -- 풀 스캔으로 읽은 총 레코드 수
          idx_scan,                -- 인덱스 스캔이 발생한 횟수
          idx_tup_fetch,           -- 인덱스를 통해 가져온 총 레코드 수
          n_tup_ins AS inserts,    -- INSERT된 로우 수
          n_tup_upd AS updates,    -- UPDATE된 로우 수
          n_tup_del AS deletes,     -- DELETE된 로우 수
          n_tup_hot_upd, 
	        n_tup_newpage_upd 
      FROM 
          pg_stat_user_tables
      WHERE 
          relname = '${tableName}';
      `
    );

    return res.rows[0];
  }  
  catch(error){
    console.error('작업 중 에러 발생:', error);
  }
  finally{
      await client.release()
  }
}

export async function inspectPhysicalTable(tableName){
  if(!pool){
    throw Error(`pool is not created`);
  }

  const client = await pool.connect();

  try{
    const res = await client.query(
      `
      SELECT 
          t.tablename AS table_name,
          t.indexname AS index_name,
          stat.*
      FROM (
          -- 1. 지정한 3개 테이블의 인덱스 목록 추출
          SELECT schemaname, tablename, indexname, indexname::regclass AS index_oid
          FROM pg_indexes
          WHERE tablename = '${tableName}'
      ) t
      CROSS JOIN LATERAL pgstattuple(t.tablename) stat;
      `
    );

    return res.rows[0];
  }  
  catch(error){
    console.error('작업 중 에러 발생:', error);
  }
  finally{
      await client.release()
  }
}

export async function inspectQuery(strings){

  if(!pool){
    throw Error(`pool is not created`);
  }

  //WHERE description ~ '(?=.*apple)(?=.*banana)'

  const reg = strings.map(str => `(?=.*${str})`).join('');
  const client = await pool.connect();
  try{
    const res = await client.query(
      `
      SELECT 
        query, 
        ROUND(mean_exec_time::numeric,3) AS mean_exec_ms, 
        ROUND(stddev_exec_time::numeric,3) AS stddev_t,
        rows, 
        calls,
        shared_blks_read,
        shared_blks_hit,
        ROUND(100.0 * (shared_blks_hit) / NULLIF(shared_blks_read  + shared_blks_hit, 0), 2) AS buf_hit_ratio,
        ROUND(100.0 * (local_blks_hit) / NULLIF(local_blks_read  + local_blks_hit, 0), 2) AS local_hit_ratio
      FROM pg_stat_statements 
      WHERE query ~ '${reg}'
      ORDER BY calls DESC;
      `
    );

    return res.rows[0];
  }  
  catch(error){
    console.error('작업 중 에러 발생:', error);
  }
  finally{
      await client.release()
  }
}