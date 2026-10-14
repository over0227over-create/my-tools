'use strict';
document.getElementById('run').addEventListener('click',async()=>{
  const button=document.getElementById('run');
  const status=document.getElementById('status');
  let article;
  try {
    article=JSON.parse(document.getElementById('data').value);
    if(article.format!=='note-draft-v1'||typeof article.title!=='string'||typeof article.body!=='string'||(!article.title.trim()&&!article.body.trim())) throw Error();
  } catch(e) { status.textContent='作業机の「note用データをコピー」でコピーしたデータを貼り付けてください。';return; }
  button.disabled=true;status.textContent='入力しています。この小窓は開いたままお待ちください。';
  try {
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab||!tab.id||!tab.url||!/^https:\/\/editor\.note\.com\/notes\/[^/]+\/edit\/?(?:[?#].*)?$/.test(tab.url)) throw Error('noteの記事編集画面を開いてから、この機能を押してください。');
    const results=await chrome.scripting.executeScript({target:{tabId:tab.id},world:'MAIN',func:fillNoteDraft,args:[article,document.getElementById('save').checked]});
    const result=results[0]?.result;
    status.textContent=result?.message||'結果を確認できませんでした。noteの画面を確認してください。';
  } catch(e) { status.textContent=e.message+'\n画面に入力済みの文章がないか確認してください。'; }
  finally {button.disabled=false;}
});

async function timerAction(action) {
  const message=document.getElementById('timer-message');
  const button=document.getElementById('schedule');
  let due=0;
  if(action==='start') {
    due=new Date(document.getElementById('publish-time').value).getTime();
    if(!Number.isFinite(due)||due<Date.now()+10000){message.textContent='現在より10秒以上先の日時を指定してください。';return;}
    if(!document.getElementById('publish-consent').checked){message.textContent='記事と公開設定を確認して、公開を許可するチェックを入れてください。';return;}
  }
  button.disabled=true;
  try {
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab?.id||!/^https:\/\/editor\.note\.com\/notes\/[^/]+\/publish\/?(?:[?#].*)?$/.test(tab.url||''))throw Error('noteの公開設定画面を開いてから、この機能を使ってください。');
    const result=await chrome.scripting.executeScript({target:{tabId:tab.id},world:'MAIN',func:manageNotePublishTimer,args:[action,due]});
    message.textContent=result[0]?.result?.message||'状態を取得できませんでした。note画面のタイマーを確認してください。';
  }catch(e){message.textContent=e.message;}finally{button.disabled=false;}
}
document.getElementById('schedule').onclick=()=>timerAction('start');
document.getElementById('cancel-timer').onclick=()=>timerAction('cancel');
document.getElementById('timer-status').onclick=()=>timerAction('status');
