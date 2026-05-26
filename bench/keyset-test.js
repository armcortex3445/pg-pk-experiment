import sql from 'k6/x/sql';
import driver from 'k6/x/sql/driver/postgres';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import encoding  from 'k6/encoding';

// PostgreSQL 연결 문자열 설정 (Connection String)
// 형식: postgres://유저명:비밀번호@호스트:포트/DB명?sslmode=disable

const DB_CONFIG = {
  user : __ENV.DB_USER,
  pw : __ENV.DB_USER_PW,
  host : __ENV.DB_HOST,
  port : __ENV.DB_PORT,
  dbName : __ENV.DB_NAME,
  sslMode : __ENV.DB_SSL_MODE
}

const db = sql.open(driver, `postgres://${DB_CONFIG.user}:${DB_CONFIG.pw}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.dbName}?sslmode=${DB_CONFIG.sslMode}`);

// 외부 텍스트 파일을 안전하게 메모리에 딱 한 번만 로드 (SharedArray 사용)

const tableName = __ENV.TARGET_TABLE;
// const dir = `../output/pk`
const pks = new SharedArray(`${tableName}_pks`,()=>{
    const rows = db.query(`SELECT id from ${tableName} TABLESAMPLE SYSTEM_ROWS(40000)`);
    // const rows = [{id : [48,49,57,101,52,53,57,101,45,99,48,97,54,45,55,50,51,98,45,57,56,54,51,45,98,102,52,100,54,98,51,51,50,53,102,51]}]
    if(Array.isArray(rows[0].id)){
      return rows.map((row)=>String.fromCharCode(...row.id));
    }
    return rows.map(row=>row.id);
  });


export const options = {
  vus: 10,           // 가상 사용자 수
  duration: '600s',  // 테스트 진행 시간
  // iterations : 1000,
};

export function setup() {
  
}

export function teardown() {
  // 테스트 종료 후 DB 연결 종료
  db.close();
}

export default function () {


  const lineIdx = Math.floor(Math.random() * pks.length)
  const targetId = pks[lineIdx];
  
  const rows = db.query(`SELECT * 
    FROM ${tableName} 
    WHERE id > $1 
    ORDER BY id ASC
    LIMIT 50;
    ` , targetId);


    // check(rows, {
    //   'is bigger than targetId  ': (rows) => Number.isInteger(targetId) ? row.id > targetId : String.fromCharCode(...row.id) > targetId)
    // });

  // VU 간의 동시 요청 간격을 제어하기 위한 짧은 휴식
  sleep(0.1);
}