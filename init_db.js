import { v4, v7 } from 'uuid';
import { createUUIDTable, createIntegerTable, insertRows,loadPK,close, init } from './lib/db.js';
import dotenv from 'dotenv';


async function main() {

    let idNum = 0;
    function getAutoIncrement(){

        return ++idNum;
    }


    // 1. .env 파일의 환경 변수 로드
    dotenv.config();
    
    // 2. PostgreSQL Connection Pool 설정
    
    const dbConfig = {
        user: process.env.DB_USER,
        password: process.env.DB_USER_PW,
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME,
        // SSL 설정 (필요에 따라 조절)
        ssl: process.env.DB_SSLMODE === 'disable' ? false : { rejectUnauthorized: false }
      }



    const testEnvList = [
        {
            tableName : 'ran_uuid_tbl',
            pk : v4,
            createTableFunc : createUUIDTable
        },
        {
            tableName : 'seq_uuid_tbl',
            pk : v7,
            createTableFunc : createUUIDTable
        },
        {
            tableName : 'seq_int_tbl',
            pk : getAutoIncrement,
            createTableFunc : createIntegerTable
        },
        //         {
        //     tableName : 'test_tbl',
        //     pk : getAutoIncrement,
        //     createTableFunc : createIntegerTable
        // },
        
    ]

    const insertCount = 4000000;
    
    init(dbConfig);

    for( const {tableName,pk, createTableFunc} of testEnvList){
        const startTime = Date.now();

        await createTableFunc(tableName);
        console.log(`${tableName} 생성 성공!`);
        await insertRows(tableName,pk,insertCount);
        console.log(`${tableName} ${insertCount}개 데이터 삽입 완료`);
        const endTime = Date.now();
        console.log(`소요 시간: ${(endTime - startTime).toFixed(2)} ms`);
    };


    await close();

}

main();