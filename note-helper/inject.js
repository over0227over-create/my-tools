/* This function is self-contained because Chrome serializes it for execution. */
async function fillNoteDraft(article, saveDraft) {
  if (location.hostname !== 'editor.note.com' || !/^\/notes\/[^/]+\/edit\/?$/.test(location.pathname)) {
    return {ok:false, message:'noteの記事編集画面を開いてから実行してください。'};
  }
  const titles = document.querySelectorAll('textarea[placeholder="記事タイトル"]');
  const bodies = document.querySelectorAll('.ProseMirror[contenteditable="true"][role="textbox"]');
  if (titles.length !== 1 || bodies.length !== 1) return {ok:false,message:'入力欄を一意に見つけられませんでした。noteの画面が変わった可能性があります。'};
  const title = titles[0];
  const body = bodies[0];
  if (title.value.trim() || body.textContent.trim() || body.querySelector('img,video,audio,iframe,table,hr')) {
    return {ok:false,message:'文章や画像が入っています。新しい空の記事で実行してください。既存の記事は変更していません。'};
  }
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const normalize = text => text.replace(/\r\n?/g,'\n').replace(/\n+$/,'');
  try {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
    title.focus(); setter.call(title,article.title);
    title.dispatchEvent(new Event('input',{bubbles:true}));
    title.dispatchEvent(new Event('change',{bubbles:true}));
    await wait(150);
    const editor = document.querySelector('.ProseMirror[contenteditable="true"][role="textbox"]');
    if (!editor || editor.textContent.trim()) throw Error('本文欄が変わりました。');
    editor.focus();
    const range = document.createRange(); range.selectNodeContents(editor);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    if (article.body && !document.execCommand('insertText',false,article.body.replace(/\r\n?/g,'\n'))) throw Error('本文の入力操作が拒否されました。');
    await wait(300);
    const actualTitle = document.querySelector('textarea[placeholder="記事タイトル"]');
    const actualBody = document.querySelector('.ProseMirror[contenteditable="true"][role="textbox"]');
    if (!actualTitle || !actualBody || actualTitle.value !== article.title || normalize(actualBody.innerText) !== normalize(article.body)) {
      throw Error('入力した文章と画面の文章が一致しません。');
    }
    if (!saveDraft) return {ok:true,message:'タイトルと本文を入力しました。画面で内容を確認してください。'};
    const buttons = Array.from(document.querySelectorAll('button')).filter(b=>b.textContent.trim()==='下書き保存');
    if (buttons.length!==1 || buttons[0].disabled || buttons[0].getAttribute('aria-disabled')==='true') {
      return {ok:false,message:'入力できましたが「下書き保存」を押せませんでした。画面で内容を確認して保存してください。'};
    }
    buttons[0].click();
    return {ok:true,message:'入力して「下書き保存」を押しました。保存が完了したか、noteの画面で確認してください。'};
  } catch (e) {
    return {ok:false,message:'入力が途中で止まりました。自動の保存操作は行っていません。画面の文章を確認してください。\n'+e.message};
  }
}
