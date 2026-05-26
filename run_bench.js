import { init, resetPGStatStatements,close } from './lib/db.js';
import dotenv from 'dotenv';
import { runBench } from './lib/k6.js'


async function main(){

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
        },
        {
            tableName : 'seq_uuid_tbl',
        },
        {
            tableName : 'seq_int_tbl',
        },
        
    ]
    
    init(dbConfig);

    const benchFiles = [
        './bench/keyset-test.js'
        ,'./bench/select-test.js'
        ,'./bench/update-test.js'
    ];

    console.log('init pg_stat_statements');
    await resetPGStatStatements();

    // close 안하면 에러 발생하는지 확인 필요
    await close();

    console.log(`running benches. Total : ${benchFiles.length}`);
    const startTime = Date.now();
    for( const {tableName} of testEnvList){
        for(const benchFile of benchFiles){
            await runBench(benchFile,tableName);
        }
        
    };
    const endTime = Date.now();
    console.log(`소요 시간: ${(endTime - startTime).toFixed(2)} ms`);


}

main();