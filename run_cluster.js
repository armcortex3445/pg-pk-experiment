import { init, close,inspectTableCorrelation,runCluster } from './lib/db.js';
import dotenv from 'dotenv';
import { generateTxtFilePath } from './lib/fs.js'
import { createWriteStream } from 'fs';
import { chdir } from 'process';
import { Console } from 'console';



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

    const txtName = 'correlation';
    const filePath = generateTxtFilePath({
        txtName,
        dir : './output',
    })
    const output = createWriteStream(filePath, { encoding: 'utf8' });

    const fileConsole = new Console({ stdout: output });

    console.log(`running`);
    const startTime = Date.now();

    //1.
    fileConsole.log(`Measure Correlation Between table and index(PK)`);
    const beforeData = await Promise.all(testEnvList.map( ({tableName}) => inspectTableCorrelation({tableName,indexColum : 'id'}))).catch(err => console.log(err));
    fileConsole.log(`Before : Cluster`);
    fileConsole.table(beforeData);
    fileConsole.log(`\n`);

    //2.
    await runCluster({tableName : 'ran_uuid_tbl' , indexName : 'ran_uuid_tbl_pkey'});


    //3.
    const afterData = await Promise.all(testEnvList.map( ({tableName}) => inspectTableCorrelation({tableName,indexColum : 'id'}))).catch(err => console.log(err));
    fileConsole.log(`After : Cluster`);
    fileConsole.table(afterData);

    const endTime = Date.now();
    console.log(`소요 시간: ${(endTime - startTime).toFixed(2)} ms`);

    // close 안하면 에러 발생하는지 확인 필요
    await close();



    // 4. 스트림 닫기
    output.end(() => {
        console.log(`successful creating ${txtName}`);
    });
}

main();