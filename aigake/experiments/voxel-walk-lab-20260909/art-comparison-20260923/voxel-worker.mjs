import {voxelize} from './design.mjs';
import {voxelizeRefined} from './refined.mjs';
self.onmessage=e=>{try{self.postMessage({cells:e.data.refined?voxelizeRefined(e.data):voxelize(e.data)});}catch(error){self.postMessage({error:error.message});}};
