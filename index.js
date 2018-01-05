/**
 * Created by Administrator on 2017/8/25.
 */
let 小说名称="超品相师";
let 请求数=100;

const [fs,path,req,cheerio,async,slog]=[require("fs"),require("path"),require("request"),require("cheerio"),require("async"),require('single-line-log').stdout];
let _ajax=function(src,callback){
    req(src,(err,res,body)=>{
        callback(err,res,body)
    })
};
let 章节列表=[];
let htmlDecode=function(str) {
    str = unescape(str.replace(/\\u/g, "%u"));
    str = str.replace(/&#(x)?(\w+);/g, function($, $1, $2) {
        return String.fromCharCode(parseInt($2, $1? 16: 10));
    });
    return str;
};
function ProgressBar(description, bar_length){
    this.description = description || '下载进度';
    this.length = bar_length || 40;
    this.render = function (opts){
        let percent = (opts.completed / opts.total).toFixed(4);
        let cell_num = Math.floor(percent * this.length);
        let cell = '';
        for (let i=0;i<cell_num;i++) {
            cell += '█';
        }
        let empty = '';
        for (let i=0;i<this.length-cell_num;i++) {
            empty += '░';
        }
        let cmdText = this.description + ': '+ cell + empty + ' ' + opts.completed + '/' + opts.total;
        slog(cmdText);
    };
}
new Promise(function(resolve, reject) {
    _ajax("http://zhannei.baidu.com/cse/search?q="+encodeURI(小说名称)+"&click=1&s=5199337987683747968&nsid=",(e,d,b)=>{
        if(!e){
            resolve(b);
        }else{
            reject(e)
        }
    })
}).then(function (d) {
    let $=cheerio.load(d);
    let 地址=$('.result-item').eq(0).find('.result-game-item-pic a').attr('href');
    if(!地址){
        console.log("> 无结果");
        return false;
    }
    console.log("> 获取地址成功",地址);
    _ajax(地址,function(err,res,body){
        if(!err){
            let $=cheerio.load(body);
            let name=$('#info').find('h1').text();
            let 小说内容="";
            if(小说名称!==name){
                console.log("> 无结果");
                return false;
            }
            let 保存位置=path.join(__dirname,"txt",小说名称+".txt");
            let 下载网站=地址.replace(/[^/]+\/$/,"");
            let _a=$("#list").find('a');
            let opts={
                total:_a.length,
                completed:0
            };
            let num=0,flag=false;
            let _ProgressBar=new ProgressBar();
            _a.each(function(i,e){
                let [章节名称,章节地址]=[$(this).text(),$(this).attr("href")];
                章节列表.push({
                    章节名称,
                    章节地址
                });
            });
            if(章节列表.length>0)console.log("> 获取章节列表成功");
            let _fn=function(){
                let asyncFnArr=[];
                let maxLength=章节列表.length;
                for(let i=0;i<请求数;i++){
                    if(num+i<maxLength){
                        asyncFnArr.push(function(callback){
                            let src=下载网站+章节列表[(num+i)].章节地址;
                            let name=章节列表[(num+i)].章节名称;
                            let _fu=function (s,n) {
                                req(s,(err,res,body)=>{
                                    if(err){
                                        _fu(s,n);
                                    }else{
                                        let $=cheerio.load(body);
                                        num++;
                                        opts.completed=num;
                                        _ProgressBar.render(opts);
                                        try {
                                            callback("",n+"\r\n"+htmlDecode($("#content").html().replace(/<br>/g,"\r\n"))+"\r\n");
                                        }
                                        catch (err){
                                            console.error("html",$("#content").html());
                                            callback("","")
                                        }

                                    }
                                })
                            };
                            _fu(src,name)
                        })
                    }else{
                        flag=true;
                        break;
                    }
                }
                async.parallel(asyncFnArr,
                    function(err, 章节内容){
                        if(err){
                            console.log("222",err);
                            return;
                        }
                        if(flag){
                            小说内容+=章节内容.join(" ");
                            let _save=function(){
                                let promise = new Promise(function(resolve, reject) {
                                    fs.writeFile(保存位置,小说内容,(err,d)=>{
                                        if(err){
                                            reject(err);
                                        }else{
                                            resolve(d);
                                        }
                                    });
                                });
                                promise.then(function(d){
                                    console.log("\r\n--------------------------------下载完成--------------------------------");
                                },function(err){
                                    _save()
                                })
                            };
                            _save()
                        }else{
                            小说内容+=章节内容.join(" ");
                            _fn();
                        }
                    }
                );
            };
            _fn();
        }else{
            console.log("err>>>",err)
        }
    });
});
