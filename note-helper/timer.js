/* Runs in the selected note tab. A navigation/reload destroys this timer. */
function manageNotePublishTimer(action, dueAt) {
  const key = '__noteWritingDeskPublishTimerV1';
  const overlayId = 'note-writing-desk-publish-timer';
  const active = window[key];
  if (action === 'status') return {ok:true,message:active?.message || 'このタブで待機中のタイマーはありません。'};
  if (action === 'cancel') {
    if (active?.cancel) {active.cancel('タイマーを取り消しました。公開操作は行っていません。');return {ok:true,message:active.message};}
    return {ok:true,message:'このタブで待機中のタイマーはありません。'};
  }
  if (action !== 'start') return {ok:false,message:'不明な操作です。'};
  if (location.hostname !== 'editor.note.com' || !/^\/notes\/[^/]+\/publish\/?$/.test(location.pathname)) return {ok:false,message:'noteの「公開に進む」を押した公開設定画面で設定してください。'};
  const due = Number(dueAt);
  if (!Number.isFinite(due) || due < Date.now()+10000) return {ok:false,message:'現在より10秒以上先の日時を指定してください。'};
  if (active?.running) return {ok:false,message:'このタブではすでに待機中です。先に取り消してください。'};
  const findButton = () => Array.from(document.querySelectorAll('button')).filter(b=>b.textContent.trim()==='投稿する'&&b.getClientRects().length>0);
  const ready = b => b && !b.disabled && b.getAttribute('aria-disabled')!=='true';
  const buttons = findButton();
  if (buttons.length!==1 || !ready(buttons[0])) return {ok:false,message:'有効な「投稿する」ボタンを一意に見つけられませんでした。'};
  // Bind to this article and the current settings; never guess after a change.
  const targetUrl = location.href;
  const snapshot = () => {
    const copy = document.body.cloneNode(true);
    copy.querySelector('#'+overlayId)?.remove();
    copy.querySelectorAll('script,style').forEach(e=>e.remove());
    const fields = Array.from(document.querySelectorAll('input,textarea,select,[role="radio"],[role="switch"]')).map(e=>[e.tagName,e.type,e.value,e.checked,e.getAttribute('aria-checked')]);
    return JSON.stringify([copy.textContent.replace(/\s+/g,' ').trim(),fields]);
  };
  document.getElementById(overlayId)?.remove();
  const initialSettings = snapshot();
  const box = document.createElement('div');box.id=overlayId;
  box.style.cssText='position:fixed;bottom:18px;right:18px;z-index:2147483647;background:#fff;color:#263c35;border:2px solid #28684f;border-radius:12px;padding:16px;box-shadow:0 4px 24px #0002;max-width:360px;font:14px/1.7 system-ui;';
  const text = document.createElement('div');text.setAttribute('role','status');text.setAttribute('aria-live','polite');
  const cancel = document.createElement('button');cancel.textContent='タイマーを取り消す';cancel.style.cssText='margin-top:10px;padding:8px 12px;cursor:pointer;';
  box.append(text,cancel);document.body.append(box);
  const label = new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZoneName:'short'}).format(new Date(due));
  const state = {running:true,message:'',handle:null,cancel:null};window[key]=state;
  const show = message => {state.message=message;text.textContent=message;};
  const stop = message => {state.running=false;clearTimeout(state.handle);cancel.hidden=true;show(message);};
  state.cancel = message => {if(state.running)stop(message);};
  cancel.addEventListener('click',()=>state.cancel('取り消しました。公開操作は行っていません。'));
  window.addEventListener('pagehide',()=>state.cancel('画面を離れたため取り消しました。'),{once:true});
  const tick = () => {
    if (!state.running) return;
    if (location.href!==targetUrl) return stop('記事または画面が変わったため停止しました。公開していません。');
    if (snapshot()!==initialSettings) return stop('公開設定画面の内容が変わったため停止しました。設定を確認して、再度タイマーを設定してください。');
    const remaining = due-Date.now();
    if (remaining>0) {
      show(label+' に「投稿する」を押します。\nあと '+Math.ceil(remaining/1000)+'秒。PCとBrave、このタブを開いたままにしてください。');
      state.handle=setTimeout(tick,Math.min(1000,remaining));return;
    }
    if (remaining < -120000) return stop('予定時刻から2分以上遅れたため停止しました。公開していません。');
    const found = findButton();
    if(found.length!==1 || !ready(found[0]))return stop('「投稿する」ボタンを押せないため停止しました。公開結果を確認してください。');
    // Mark finished before clicking: do not retry an uncertain publication.
    stop('「投稿する」を1回押しました。公開の完了はnoteの画面で確認してください。');
    try {found[0].click();}catch(e){show('公開操作でエラーが発生しました。再実行せず、noteの公開結果を確認してください。');}
  };
  tick();
  return {ok:true,message:state.message};
}
