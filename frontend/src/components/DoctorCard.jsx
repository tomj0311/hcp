import React from 'react';
import { Card, CardContent, Typography, CardActionArea, Stack, Avatar } from '@mui/material';

export default function DoctorCard({ doctor, onSelect }){
  return (
    <Card sx={{ minWidth: {xs: 150, sm: 200}, width: '100%' }}>
      <CardActionArea onClick={()=>onSelect?.(doctor)}>
        <CardContent sx={{p:{xs:1.5, sm:2}}}>
          <Stack direction={{xs:'column', sm:'row'}} spacing={{xs:1, sm:2}} alignItems="center">
            <Avatar sx={{width:{xs:32, sm:40}, height:{xs:32, sm:40}}}>{doctor.name?.[0]||'D'}</Avatar>
            <div style={{textAlign: window.innerWidth < 600 ? 'center' : 'left'}}>
              <Typography variant="subtitle1" sx={{fontWeight:600, fontSize:{xs:'0.9rem', sm:'1rem'}}}>{doctor.name}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{fontSize:{xs:'0.7rem', sm:'0.75rem'}}}>Rank: {doctor.rank}</Typography>
            </div>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
