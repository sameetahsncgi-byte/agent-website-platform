import fs from 'node:fs/promises';
import {makeSeoSiteHandler} from '../server/seoSite.js';
import {renderSite} from '../.server/entry-server.js';
export default makeSeoSiteHandler({render:renderSite,template:()=>fs.readFile(new URL('../dist/index.html',import.meta.url),'utf8')});
