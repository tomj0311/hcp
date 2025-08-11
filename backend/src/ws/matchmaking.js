// Basic doctor matchmaking broadcast via WebSocket
export function initMatchmaking(wss){
  wss.on('connection', (ws)=>{
    ws.send(JSON.stringify({ type:'welcome', message:'Connected to virtual doctor realtime channel'}));

    ws.on('message', (raw)=>{
      try {
        const msg = JSON.parse(raw.toString());
        if(msg.type === 'ping'){
          ws.send(JSON.stringify({type:'pong', time: Date.now()}));
        }
        if(msg.type === 'consult_request'){
          // naive broadcast to doctors
          wss.clients.forEach(client => {
            if(client !== ws && client.readyState === 1){
              client.send(JSON.stringify({ type:'consult_request', from: msg.user || 'anonymous', symptom: msg.symptom }));
            }
          });
        }
      } catch(e){
        ws.send(JSON.stringify({type:'error', error:'Invalid message'}));
      }
    });
  });
}
