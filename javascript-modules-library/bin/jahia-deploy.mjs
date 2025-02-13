import dotenv from 'dotenv';
import {execSync} from 'child_process';
import path from 'path';

dotenv.config();

const deployMethod = process.env.JAHIA_DEPLOY_METHOD;

const packageFilePath = path.resolve('dist/package.tgz');

if (deployMethod === 'curl') {
    console.log('Deploying URL curl to Jahia bundles REST API...');
    console.log(
        execSync(
            `curl -s --user ${process.env.JAHIA_USER} --form bundle=@${packageFilePath} --form start=true ${process.env.JAHIA_HOST}/modules/api/bundles`,
            {encoding: 'utf8'}
        )
    );
} else {
    console.log('Deploying using Docker copy...');
    console.log(
        execSync(
            `docker cp ${packageFilePath} ${process.env.JAHIA_DOCKER_NAME}:/var/jahia/modules`,
            {encoding: 'utf8'}
        )
    );
}
