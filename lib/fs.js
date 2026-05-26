import { createWriteStream,existsSync, mkdirSync } from 'fs';
import { Console } from 'console';
import { basename, dirname, extname } from 'path';

const OUTPUT_DIR = './output/'

export function generateTxtFilePath({txtName}){
    let cnt = 1; 
    const max = 10;
    const dir = `${OUTPUT_DIR}/result/${generateDirName()}`
    let filePath = `${dir}/${txtName}.txt`;

    mkdirSync(dir,{
        recursive : true,
    });

    for(cnt; cnt < max; cnt++){
        if(!existsSync(filePath)){
            break;
        }

        filePath =  `${OUTPUT_DIR}/${txtName}-${cnt}.txt`
    }

    if(cnt === max){
        throw Error(`Can't create txt file`);
    }

    return filePath;
}

export function generateDirName(){

    const now = new Date();

    // 연도 뒤의 2자리만 추출 (예: 2026 -> 26)
    const yy = String(now.getFullYear()).slice(-2); 
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    
    const formattedDate = `${yy}${mm}${dd}_${hh}${min}`;

    return formattedDate;
}