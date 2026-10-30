import {createServer} from 'vite';
// Local-only acceptance page. Never a production route/public asset.
const port=Number(process.env.JOBPILOT_HARNESS_PORT||5175);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid local harness port');
const server=await createServer({configFile:false,root:process.cwd(),server:{host:'127.0.0.1',port,strictPort:true}});
await server.listen();server.printUrls();
