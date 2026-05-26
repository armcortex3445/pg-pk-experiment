import { spawn } from 'child_process';
import { basename } from 'path';
import { mkdir } from 'fs/promises';
import { generateDirName } from './fs'

export function runBench(file,tableName){

    return new Promise (async (resolve, reject) => {
        console.log(`Start : ${tableName} bench ${file} `);
        
        const dir = `./output/k6/${generateDirName()}`

        await mkdir(dir,{recursive : true});
        const benchName = basename(file,'.js');
        const output= `${dir}/${benchName}-report_${tableName}_.html`;
        const k6 = spawn('./k6',[
            'run',
            '-e', `TARGET_TABLE=${tableName}`,
            file,
        ],{
            stdio : 'inherit',
            env: {

                ...process.env,
                K6_WEB_DASHBOARD : true,
                K6_WEB_DASHBOARD_EXPORT : output,
            }   
        });

        // k6.stdout.on('data' , (data) => {
        //     process.stdout.write(data);
        // });

        // k6.stderr.on('data', (data) => {
        //     process.stderr.write(data);
        //   });

        k6.on('close', (code) => {
            console.log(`\n--------------------------------------------`);
            if (code === 0) {
                console.log(`Successful End : ${tableName} bench ${file} `);
                console.log(`\n--------------------------------------------`);
                resolve();
            } else {
                console.log(`\n--------------------------------------------`);
                reject(new Error(`Error : ${tableName} bench ${file} with ${code}`));
            }
        });

    });
}