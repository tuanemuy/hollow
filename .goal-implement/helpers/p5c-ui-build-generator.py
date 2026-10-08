import os
os.umask(0o077)
import json,subprocess,uuid,hashlib,sys,stat
from pathlib import Path
R=Path('/Users/hikaru/github.com/tuanemuy/hollow')
C='b6e567b24e24c78e26bb1bbb147bdf0fc6588bd3'

def wx(path,data):
    fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(fd,'wb') as output:output.write(data)

def initial_modes(root):
    for folder,dirs,files in os.walk(root,followlinks=False):
        for path in [Path(folder)]+[Path(folder)/name for name in dirs+files]:
            info=path.lstat()
            expected=0o700 if stat.S_ISDIR(info.st_mode) else 0o600
            if stat.S_ISLNK(info.st_mode) or info.st_mode&0o777!=expected:raise RuntimeError('INITIAL_MODE')

BUILD_PROGRAM=r"""import os
os.umask(0o077)
import json,tarfile,subprocess,hashlib,time,signal,stat,re
from pathlib import Path
B=Path(__file__).resolve().parents[1]; P=json.loads((B/'material/plan.json').read_text()); S=B/'source'; W=S/'apps/web'; D=W/'dist'; R=Path(P['repository']); C=P['candidate']; L=P['limits']; start=time.monotonic(); peak={}; phases=[]
def wx(path,data):
 fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
 with os.fdopen(fd,'wb') as output:output.write(data)
def guard(stable=False,initial=False):
 sizes={'source_material':0,'dist':0,'logs':0,'tmp':0}; links=set(); pending=[B]
 while pending:
  q=pending.pop()
  try:items=list(os.scandir(q))
  except FileNotFoundError:
   if not stable and (q.is_relative_to(B/'tmp') or '.vite-temp' in q.parts):continue
   raise
  for entry in items:
   path=Path(entry.path)
   try:info=entry.stat(follow_symlinks=False)
   except FileNotFoundError:
    if not stable and (path.is_relative_to(B/'tmp') or '.vite-temp' in path.parts):continue
    raise
   if stat.S_ISLNK(info.st_mode):
    if initial:raise RuntimeError('INITIAL_SYMLINK')
    links.add(str(path)); target=os.readlink(path)
    if path==S/'AGENTS.md':
     if target!='CLAUDE.md':raise RuntimeError('TRACKED_LINK')
    elif P['links'].get(str(path))!=target:raise RuntimeError('UNDECLARED_LINK')
   elif stat.S_ISDIR(info.st_mode):
    if info.st_mode&0o777!=0o700:raise RuntimeError('DIRECTORY_MODE')
    pending.append(path)
   elif stat.S_ISREG(info.st_mode):
    if info.st_mode&0o777!=0o600:raise RuntimeError('FILE_MODE')
    category='dist' if path.is_relative_to(D) else 'logs' if path.is_relative_to(B/'logs') else 'tmp' if path.is_relative_to(B/'tmp') else 'source_material'
    sizes[category]+=info.st_size
   else:raise RuntimeError('FILE_TYPE')
 for key,size in sizes.items():
  peak[key]=max(peak.get(key,0),size)
  if size>L[key]:raise RuntimeError('CAPACITY_'+key)
 total=sum(sizes.values());peak['root']=max(peak.get('root',0),total)
 if total>L['root']:raise RuntimeError('CAPACITY_ROOT')
 archive_path=B/'source-archive.tar.gz'
 if archive_path.exists() and archive_path.stat().st_size>8*1048576:raise RuntimeError('ARCHIVE_CAPACITY')
 if stable and links!=set(P['links'])|{str(S/'AGENTS.md')}:raise RuntimeError('LINK_SET')
 return sizes

def check_sources():
 result={};total=0
 for name,entry in P['entries'].items():
  path=S/name
  data=os.readlink(path).encode() if entry['mode']=='120000' else path.read_bytes()
  blob=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
  if blob!=entry['blob']:raise RuntimeError('SOURCE_BLOB_MISMATCH')
  result[name]={'blob':blob,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'mode':entry['mode']};total+=len(data)
 return result,total

def absent(pid):
 answer={}
 for kind,number in [('pid',pid),('pg',-pid)]:
  try:os.kill(number,0);answer[kind]=False
  except ProcessLookupError:answer[kind]=True
 return answer

guard(initial=True)
compile((B/'material/build.py').read_text(),str(B/'material/build.py'),'exec')
env={'PATH':os.environ['PATH'],'NODE_ENV':'production','TMPDIR':str(B/'tmp'),'TSR_TMP_DIR':str(B/'tmp/router'),'LANG':'C.UTF-8'}
def stop_group(process):
 pid=process.pid
 for sig,seconds in [(signal.SIGTERM,10),(signal.SIGKILL,10)]:
  try:os.killpg(pid,sig)
  except ProcessLookupError:return True
  until=time.monotonic()+seconds
  while time.monotonic()<until:
   process.poll()
   if absent(pid)['pg']:return True
   time.sleep(.2)
 return absent(pid)['pg']
def run_command(label,argv,seconds):
 begun=time.monotonic();process=None;reason=None;status={}
 fd=os.open(B/'logs'/(label+'.log'),os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
 with os.fdopen(fd,'wb') as log:
  try:
   process=subprocess.Popen(argv,cwd=W if label!='archive' else R,env=env,start_new_session=True,stdout=log,stderr=log)
   while process.poll() is None:
    guard()
    if time.monotonic()-begun>seconds or time.monotonic()-start>L['seconds']:raise RuntimeError('COMMAND_DEADLINE')
    time.sleep(.2)
   if not absent(process.pid)['pg']:raise RuntimeError('GROUP_NOT_CLOSED')
  except BaseException as error:
   reason=type(error).__name__+':'+str(error)
   if process is not None:
    stop_group(process)
    try:process.wait(timeout=10)
    except subprocess.TimeoutExpired:reason+=';ACTUAL_EXIT_UNPROVEN'
  finally:
   status={'label':label,'argv':argv,'pid':process.pid if process else None,'actual_exit':process.poll() if process else None,'seconds':round(time.monotonic()-begun,3),'known_absent':absent(process.pid) if process else None,'stop_reason':reason,'pipes':'unused; stdout/stderr redirected to owned log FD'}
 status['log_fd_closed']=log.closed
 wx(B/'material'/(label+'-status.json'),json.dumps(status).encode())
 print(json.dumps({'phase':status}),flush=True)
 if reason or status['actual_exit']!=0 or status['known_absent']!={'pid':True,'pg':True}:raise RuntimeError('COMMAND_FAILED')
 return status

gzip_path=B/'source-archive.tar.gz'
wx(gzip_path,b'')
archive_status=run_command('archive',['git','-C',str(R),'archive','--format=tar.gz','--output='+str(gzip_path),C],60)
if gzip_path.stat().st_size>8*1048576:raise RuntimeError('ARCHIVE_SIZE')
seen=set();extract_start=time.monotonic();extracted_bytes=0
extract_before=guard();source_overhead=extract_before['source_material'];root_overhead=sum(extract_before.values());next_extract_guard=time.monotonic()+.2
def maybe_extract_guard():
 global next_extract_guard
 if time.monotonic()>=next_extract_guard:
  guard();next_extract_guard=time.monotonic()+.2
with tarfile.open(gzip_path,mode='r:gz') as tar:
 for member in tar:
  maybe_extract_guard()
  name=member.name.rstrip('/');dest=S/name
  if not name or len(name)>4096 or Path(name).is_absolute() or '..' in Path(name).parts:raise RuntimeError('TAR_PATH')
  if time.monotonic()-extract_start>60 or time.monotonic()-start>L['seconds']:raise RuntimeError('EXTRACT_DEADLINE')
  if member.isdir():dest.mkdir(mode=0o700,parents=True,exist_ok=True);continue
  if name not in P['entries'] or name in seen:raise RuntimeError('TAR_ENTRY')
  seen.add(name);dest.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
  if member.issym():
   if name!='AGENTS.md' or member.linkname!='CLAUDE.md':raise RuntimeError('TAR_LINK')
   dest.symlink_to(member.linkname)
  elif member.isfile():
   if member.size>32*1048576:raise RuntimeError('SOURCE_SIZE')
   source=tar.extractfile(member);fd=os.open(dest,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
   with source,os.fdopen(fd,'wb') as output:
    for data in iter(lambda:source.read(65536),b''):
     output.write(data);extracted_bytes+=len(data)
     if source_overhead+extracted_bytes>L['source_material'] or root_overhead+extracted_bytes>L['root']:raise RuntimeError('EXTRACT_SIZE')
     if time.monotonic()-extract_start>60 or time.monotonic()-start>L['seconds']:raise RuntimeError('EXTRACT_DEADLINE')
     maybe_extract_guard()
  else:raise RuntimeError('TAR_KIND')
if seen!=set(P['entries']):raise RuntimeError('TAR_SET')
guard()
before,total=check_sources();wx(B/'material/source-manifest.json',json.dumps(before,sort_keys=True).encode())
for link,target in P['links'].items():
 path=Path(link);path.parent.mkdir(mode=0o700,parents=True,exist_ok=True);path.symlink_to(target)
guard(True)
commands=[['node',str(W/'node_modules/vite/bin/vite.js'),'build','--config',str(W/'vite.config.node.ts')],['node',str(W/'scripts/build-search.node.mjs')]]
for label,argv in zip(['vite','search'],commands):phases.append(run_command(label,argv,max(1,L['seconds']-(time.monotonic()-start))))
after,total_after=check_sources()
if after!=before:raise RuntimeError('SOURCE_CHANGED')
outputs={}
for root,dirs,files in os.walk(D,followlinks=False):
 for name in files:
  path=Path(root)/name
  if path.is_symlink():raise RuntimeError('OUTPUT_SYMLINK')
  data=path.read_bytes();outputs[str(path.relative_to(D))]={'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
required=['server/server.node.js','server/nodeShutdown.mjs','server/__vite_rsc_assets_manifest.js','server/rsc/__vite_rsc_assets_manifest.js','server/browse/searchSupervisor.mjs','server/browse/searchQuery.mjs','server/browse/publicQuery.mjs','server/browse/noteProjection.mjs','server/export/document.mjs','server/pdf/engine.mjs','server/pdf/documentWorker.mjs','server/pdf/supervisor.py','server/llm/sourceWorker.mjs','server/llm/documentWorker.mjs','server/llm/imageChild.mjs','server/llm/pdfPagesChild.mjs']
if not all(name in outputs for name in required):raise RuntimeError('REQUIRED_OUTPUT_MISSING')
entry_text=(D/'server/server.node.js').read_text()
entry_exports=re.search(r'export\s*\{([^}]*)\}\s*;?\s*$',entry_text)
if entry_exports is None:raise RuntimeError('ENTRY_NAMED_EXPORTS')
backup_bindings=[]
for item in entry_exports.group(1).split(','):
 match=re.fullmatch(r'\s*([A-Za-z_$][A-Za-z0-9_$]*)(?:\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*))?\s*',item)
 if match is None:raise RuntimeError('ENTRY_EXPORT_SHAPE')
 if (match.group(2) or match.group(1))=='NodeDriveBackupSource':backup_bindings.append(match.group(1))
if len(backup_bindings)!=1:raise RuntimeError('BACKUP_SOURCE_NAMED_EXPORT')
named_exports={'NodeDriveBackupSource':{'entry':'server/server.node.js','local_identifier':backup_bindings[0],'entry_sha256':outputs['server/server.node.js']['sha256']}}
manifest={'candidate':C,'tree':subprocess.check_output(['git','-C',str(R),'rev-parse',C+'^{tree}']).decode().strip(),'root':str(B),'cwd':str(W),'dist':str(D),'links_sha256':P['links_sha256'],'source_files':len(before),'source_bytes':total,'source_before_sha256':hashlib.sha256(json.dumps(before,sort_keys=True).encode()).hexdigest(),'source_after_sha256':hashlib.sha256(json.dumps(after,sort_keys=True).encode()).hexdigest(),'outputs':outputs,'required':required,'named_exports':named_exports,'phases':phases,'peak':peak,'limits':L,'archive':archive_status,'log_fd_closed':all(p['log_fd_closed'] for p in phases),'runtime_started':False,'node':subprocess.check_output(['node','--version']).decode().strip()}
wx(B/'material/build-manifest.json',json.dumps(manifest,sort_keys=True,indent=2).encode())
final=guard(True)
print(json.dumps({'candidate':C,'source_files':len(before),'source_bytes':total,'output_files':len(outputs),'output_bytes':sum(x['bytes'] for x in outputs.values()),'phases':phases,'peak':peak,'final':final,'archive':archive_status,'log_fd_closed':all(p['log_fd_closed'] for p in phases),'runtime_started':False}))

"""

def prepare():
    compile(BUILD_PROGRAM,'new-build.py','exec')
    b=Path('/Users/hikaru/.local/share/hollow-validation/goal-implement-p5c-ui-build-modechecked-20261006-c18a6f02')
    s=b/'source';links={};versions={}
    for scope in ['', 'apps/web', 'packages/core']:
        package=json.loads(subprocess.check_output(['git','-C',str(R),'show',C+':'+(scope+'/' if scope else '')+'package.json']))
        names=sorted(set(package.get('dependencies',{}))|set(package.get('devDependencies',{})))
        for name in names:
            link=s/scope/'node_modules'/name
            if name=='@repo/core':target=s/'packages/core'
            else:
                target=(R/scope/'node_modules'/name).resolve(strict=True)
                if not target.is_relative_to(R/'node_modules/.pnpm'):raise RuntimeError('PUBLIC_DEP_PREFIX')
                versions[str(link)]=json.loads((target/'package.json').read_text())['version']
            links[str(link)]=str(target)
    for name,public in [('pdfjs-dist',R/'packages/core/node_modules/pdfjs-dist'),('sharp',R/'packages/core/node_modules/sharp'),('@napi-rs/canvas',R/'node_modules/.pnpm/node_modules/@napi-rs/canvas')]:
        target=public.resolve(strict=True)
        if not target.is_relative_to(R/'node_modules/.pnpm'):raise RuntimeError('PUBLIC_DEP_PREFIX')
        links[str(s/'node_modules'/name)]=str(target);versions[str(s/'node_modules'/name)]=json.loads((target/'package.json').read_text())['version']
    links[str(s/'apps/web/node_modules/.bin/vite')]=str((R/'apps/web/node_modules/vite/bin/vite.js').resolve(strict=True))
    if len(links)!=97:raise RuntimeError('LINK_COUNT')
    raw=json.dumps(links,sort_keys=True,separators=(',',':')).encode();digest=hashlib.sha256(raw).hexdigest();entries={}
    for row in subprocess.check_output(['git','-C',str(R),'ls-tree','-rz','--full-tree',C]).split(b'\0'):
        if not row:continue
        meta,name=row.split(b'\t',1);mode,kind,sha=meta.decode().split();name=name.decode()
        if kind!='blob' or any(part in ('node_modules','dist','.env','.goal-implement') for part in name.split('/')):raise RuntimeError('TRACKED_PATH')
        if mode=='120000' and name!='AGENTS.md':raise RuntimeError('UNDECLARED_SYMLINK')
        entries[name]={'mode':mode,'blob':sha}
    b.mkdir(mode=0o700)
    for name in ('material','logs','tmp','source'):(b/name).mkdir(mode=0o700)
    plan={'candidate':C,'root':str(b),'repository':str(R),'links':links,'versions':versions,'links_sha256':digest,'entries':entries,'limits':{'root':256*1048576,'source_material':32*1048576,'dist':208*1048576,'logs':8*1048576,'tmp':8*1048576,'seconds':600,'poll_ms':200,'term_seconds':10,'kill_seconds':10,'pipe_seconds':10}}
    wx(b/'material/plan.json',json.dumps(plan,sort_keys=True).encode());wx(b/'material/link-manifest.json',raw);wx(b/'material/build.py',BUILD_PROGRAM.encode())
    initial_modes(b);compile((b/'material/build.py').read_text(),str(b/'material/build.py'),'exec')
    print(json.dumps({'B':str(b),'C':C,'links':len(links),'link_sha256':digest,'tracked_blobs':len(entries),'initial_modes':'700/600 no symlinks','helper_syntax':'compile success; pycache0','argv1':['node',str(s/'apps/web/node_modules/vite/bin/vite.js'),'build','--config',str(s/'apps/web/vite.config.node.ts')],'argv2':['node',str(s/'apps/web/scripts/build-search.node.mjs')]}))

if __name__=='__main__':
    if sys.argv[1:]!=['prepare']:raise RuntimeError('PREPARE_ONLY')
    prepare()
