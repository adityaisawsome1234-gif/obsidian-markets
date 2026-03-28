import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/embed/quote?ticker=AAPL
 *
 * Returns a self-contained HTML page for iframe embedding.
 * Lightweight — no React, just vanilla HTML/CSS/JS.
 * Includes "Powered by Obsidian Markets" branding link.
 *
 * Usage: <iframe src="https://obsidianmarkets.com/api/embed/quote?ticker=AAPL" width="320" height="180" />
 */
export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker")?.toUpperCase().replace(/[^A-Z]/g, "");
  if (!ticker || ticker.length > 5) {
    return new NextResponse("Invalid ticker", { status: 400 });
  }

  const theme = req.nextUrl.searchParams.get("theme") || "dark";
  const showChart = req.nextUrl.searchParams.get("chart") !== "false";

  const isDark = theme === "dark";
  const bg = isDark ? "#0a0a0f" : "#ffffff";
  const cardBg = isDark ? "#111118" : "#f8f8fa";
  const border = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
  const textPrimary = isDark ? "#ffffff" : "#111111";
  const textSecondary = isDark ? "#8b8b9e" : "#666666";
  const accent = "#7c5cfc";
  const green = "#22c55e";
  const red = "#ef4444";

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Inter,-apple-system,sans-serif;background:${bg};color:${textPrimary};overflow:hidden}
  .card{background:${cardBg};border:1px solid ${border};border-radius:8px;padding:14px 16px;margin:8px}
  .head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
  .ticker{font-size:15px;font-weight:700;letter-spacing:-0.3px}
  .name{font-size:10px;color:${textSecondary};margin-top:1px}
  .price{font-size:22px;font-weight:700;font-family:'JetBrains Mono',monospace;letter-spacing:-0.5px}
  .change{font-size:11px;font-weight:600;font-family:'JetBrains Mono',monospace;padding:3px 6px;border-radius:4px;margin-left:6px}
  .up{color:${green};background:rgba(34,197,94,0.1)}
  .down{color:${red};background:rgba(239,68,68,0.1)}
  .chart{width:100%;height:40px;margin:10px 0 6px}
  .footer{display:flex;align-items:center;justify-content:space-between;padding:0 4px}
  .footer a{font-size:9px;color:${accent};text-decoration:none;font-weight:600;opacity:0.7}
  .footer a:hover{opacity:1}
  .vol{font-size:9px;color:${textSecondary};font-family:'JetBrains Mono',monospace}
  .loading{display:flex;align-items:center;justify-content:center;height:100px;color:${textSecondary};font-size:11px}
  svg path{stroke-width:1.5;fill:none;stroke-linecap:round;stroke-linejoin:round}
</style>
</head>
<body>
<div class="card" id="card">
  <div class="loading">Loading ${ticker}...</div>
</div>
<script>
(function(){
  var ticker="${ticker}";
  var showChart=${showChart};

  // Fetch from parent domain API
  var base=location.origin;
  fetch(base+"/api/stock/"+ticker).then(function(r){return r.json()}).then(function(d){
    var q=d.quote||{};
    var price=(q.price||q.c||0).toFixed(2);
    var change=(q.change||q.dp||0);
    var changePct=(q.changesPercentage||q.dp||0);
    var isUp=change>=0;
    var name=q.name||d.profile?.companyName||ticker;
    var vol=q.volume||q.v||0;

    var html='<div class="head">';
    html+='<div><div class="ticker">'+ticker+'</div><div class="name">'+name+'</div></div>';
    html+='<div style="text-align:right"><span class="price">$'+price+'</span>';
    html+='<span class="change '+(isUp?'up':'down')+'">'+(isUp?'+':'')+changePct.toFixed(2)+'%</span></div></div>';

    if(showChart){
      html+='<div class="chart" id="sparkline"></div>';
    }

    html+='<div class="footer">';
    html+='<span class="vol">Vol: '+(vol>1e6?(vol/1e6).toFixed(1)+'M':vol>1e3?(vol/1e3).toFixed(0)+'K':vol)+'</span>';
    html+='<a href="https://obsidianmarkets.com/research/'+ticker+'" target="_blank">Powered by Obsidian Markets</a>';
    html+='</div>';

    document.getElementById('card').innerHTML=html;

    if(showChart){
      fetch(base+"/api/stock/"+ticker+"/chart?range=1d").then(function(r){return r.json()}).then(function(chartData){
        var points=chartData.chart||chartData||[];
        if(!points.length)return;
        var prices=points.map(function(p){return p.close||p.c||0}).filter(Boolean);
        if(prices.length<2)return;
        var min=Math.min.apply(null,prices),max=Math.max.apply(null,prices);
        var range=max-min||1;
        var w=280,h=36;
        var step=w/(prices.length-1);
        var d='M';
        prices.forEach(function(p,i){d+=(i?'L':'')+' '+(i*step).toFixed(1)+' '+(h-((p-min)/range)*h).toFixed(1)});
        var color=prices[prices.length-1]>=prices[0]?'${green}':'${red}';
        var el=document.getElementById('sparkline');
        if(el) el.innerHTML='<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" style="width:100%;height:100%"><path d="'+d+'" stroke="'+color+'" /></svg>';
      }).catch(function(){});
    }
  }).catch(function(){
    document.getElementById('card').innerHTML='<div class="loading">Failed to load '+ticker+'</div>';
  });
})();
</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      "X-Frame-Options": "ALLOWALL",
    },
  });
}
