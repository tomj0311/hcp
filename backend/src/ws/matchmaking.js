// Basic provider matchmaking broadcast via WebSocket
import jwt from 'jsonwebtoken';

export function initMatchmaking(wss){
  wss.on('connection', (ws, req)=>{
    // Extract token from ?token= query param if present
    try {
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      if(token){
        try {
          ws.user = jwt.verify(token, process.env.JWT_SECRET);
        } catch(e){ /* ignore invalid token */ }
      }
    } catch { /* ignore */ }

    ws.send(JSON.stringify({ type:'welcome', message:'Connected to realtime provider channel', role: ws.user?.role || 'guest' }));

    ws.on('message', (raw)=>{
      try {
        const msg = JSON.parse(raw.toString());
        if(msg.type === 'ping'){
          ws.send(JSON.stringify({type:'pong', time: Date.now(), role: ws.user?.role || 'guest'}));
        }
        if(msg.type === 'consult_request'){
          const payload = {
            type:'consult_request',
            from: ws.user?.id || msg.user || 'anonymous',
            role: ws.user?.role || 'guest',
            symptom: msg.symptom
          };
          wss.clients.forEach(client => {
            if(client !== ws && client.readyState === 1){
              client.send(JSON.stringify(payload));
            }
          });
        }
      } catch(e){
        ws.send(JSON.stringify({type:'error', error:'Invalid message'}));
      }
    });
  });
}
