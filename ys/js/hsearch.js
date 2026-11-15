(function(){var b=document.querySelector('.hsearch-btn');if(!b)return;var f=document.querySelector('.hsearch');if(!f)return;var i=f.querySelector('input[name="q"]');var t=null;
function arm(){clearTimeout(t);t=setTimeout(function(){if(i&&!i.value)f.classList.remove('open');},4000);}
b.addEventListener('click',function(){var o=f.classList.toggle('open');if(o){if(i)i.focus();arm();}else{clearTimeout(t);}});
if(i){i.addEventListener('input',function(){if(i.value){clearTimeout(t);}else{arm();}});i.addEventListener('blur',function(){setTimeout(function(){if(!i.value)f.classList.remove('open');},250);});}
})();
