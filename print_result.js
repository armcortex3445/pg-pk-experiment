import { init, close,inspectIndex,inspectTableIO, inspectTable, inspectPhysicalTable,inspectQuery } from './lib/db.js';
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
    const getQueryStringsFunc = {
        keyset : (tableName) => [`SELECT`,`${tableName}`,`WHERE`,`id`,`>`] ,
        select : (tableName) => [`SELECT`,`${tableName}`,`WHERE`,`id`, `=`],
        update : (tableName) => [`UPDATE`, `${tableName}`, `SET`, `val`,`WHERE`, `id`, `=`],

    }
    init(dbConfig);

    const txtName = 'test';
    const filePath = generateTxtFilePath({
        txtName,
        dir : './output',
    })
    const output = createWriteStream(filePath, { encoding: 'utf8' });

    const fileConsole = new Console({ stdout: output });

    console.log(`Start gathering Results`);
    const startTime = Date.now();

    const testResults = [
        {
            title : `Measure Index page split & Index Bloating & index fragmentation`,
            mapFunc : inspectIndex
        },
        {
            title : `Measure Disk I/O for Each Table`,
            mapFunc : inspectTableIO,
        },
        {
            title : `Measure Query Performance`,
            mapFunc : inspectQuery,
            child : {
                values : Object.keys(getQueryStringsFunc),
                subTitles : Object.keys(getQueryStringsFunc).map(key=> `Measure ${key} Query`),
                funcList : Object.keys(getQueryStringsFunc).map(key => getQueryStringsFunc[key])
            }
        },
        {
            title : `Measure Physical Disk of Each Table`,
            mapFunc : inspectPhysicalTable
        },
        {
            title : `Measure Each Table`,
            mapFunc : inspectTable,
        }



    ]

    for(let i = 0; i < testResults.length; i++){

        const { title,mapFunc,child } = testResults[i];
        fileConsole.log(`${i+1} ${title}\n`);

        try{
            if(child){
                const { values,subTitles,funcList } = child;

                for(let j = 0; j < values.length; j++){
                    fileConsole.log(`${i+1}-${j+1} ${subTitles[j]}\n`);
                    const data = await Promise.all(testEnvList.map( ({tableName}) => mapFunc(funcList[j](tableName)))).catch(err => console.log(err));
                    fileConsole.table(data);
                }
                
            }
            else{
                const data = await Promise.all(testEnvList.map( ({tableName}) => mapFunc(tableName)))
                fileConsole.table(data);
            }
        }catch(error){
            console.error(`Error occur at ${i} idx.`, error);
        }
        

    }


    
    //Measure Index page split & Index Bloating & index fragmentation 
    // const indexInspects = await Promise.all(testEnvList.map( ({tableName}) => inspectIndex(tableName)));
    
    // fileConsole.log('1.Measure Index page split & Index Bloating & index fragmentation');
    // fileConsole.log('\n');
    // fileConsole.table(indexInspects);


    // //Measure Disk I/O for Each Table
    // const tableIoInspects = await Promise.all(testEnvList.map( ({tableName}) => inspectTableIO(tableName)));
    // fileConsole.log('2.Measure Disk I/O for Each Table');
    // fileConsole.log('\n');
    // fileConsole.table(tableIoInspects);

    // //Measure Query Performance
    // fileConsole.log('3.Measure Query Performance');
    // fileConsole.log('\n');

    // for(const key of keys ){

    //     //Measure ${key} query performance
    //     const queryPerformances = await Promise.all(testEnvList.map( ({tableName}) => inspectQuery( getQueryStringsFunc[key](tableName))));
    //     fileConsole.log(`#${key} query`);
    //     fileConsole.log('\n');
    //     fileConsole.table(queryPerformances);
    // }

    // //Measure Physical Disk of Each Table
    // const tableDiskInspects = await Promise.all(testEnvList.map( ({tableName}) => inspectPhysicalTable(tableName)));
    // fileConsole.log('4.Measure Physical Disk of Each Table');
    // fileConsole.log('\n');
    // fileConsole.table(tableDiskInspects);


    // const tableInspects = await Promise.all(testEnvList.map( ({tableName}) => inspectTable(tableName)));
    // fileConsole.log('5.Measure Each Table');
    // fileConsole.log('\n');
    // fileConsole.table(tableDiskInspects);

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