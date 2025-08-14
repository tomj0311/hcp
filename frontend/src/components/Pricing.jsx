import React from 'react';
import { Grid, Card, CardContent, Typography, Button, List, ListItem, ListItemIcon, ListItemText, Chip, Box } from '@mui/material';
import { CheckCircle as CheckIcon } from 'lucide-react';
import axios from 'axios';
import PageHeader from './PageHeader.jsx';

const tiers = [
  { title:'Freemium', price:'$0', desc:'Explore providers and basic platform access.', plan:'freemium', color:'default', features:['Browse provider directory','Basic profile','Standard response times'] },
  { title:'Per Consultation', price:'$50', desc:'One-off live consultation.', plan:'consultation', color:'primary', features:['Everything in Freemium','1 live consultation credit','Priority response slot','Basic transcript'] },
  { title:'Enterprise', price:'$100', desc:'Priority support & extended features for teams.', plan:'enterprise', color:'secondary', features:['All Consultation features','Unlimited consult requests*','Dedicated support channel','Advanced analytics (coming soon)'] }
];

export default function Pricing(){
  const checkout = async (plan)=>{
    const res = await axios.post(import.meta.env.VITE_API_URL + '/payments/checkout-session',{plan});
    if(res.data.url) window.location.href = res.data.url;
  };
  return (
    <Box sx={{px:{xs:1, sm:2}}}>
  <PageHeader title="Pricing" mb={{ xs: 2, md: 4 }} />
      <Grid container spacing={{xs:2, sm:3, md:4}} sx={{mt:1, justifyContent:'center'}}>
        {tiers.map(t => (
          <Grid item xs={12} sm={6} md={4} key={t.title}>
            <Card sx={{height:'100%', position:'relative', overflow:'hidden', display:'flex', flexDirection:'column', border:(theme)=> t.color!=='default'? `1px solid ${theme.palette[t.color].main}`:`1px solid ${theme.palette.divider}`, backdropFilter:'blur(4px)', boxShadow:(theme)=> t.color!=='default'? '0 8px 32px -12px rgba(0,0,0,0.25)':'0 4px 18px -8px rgba(0,0,0,0.15)', transition:'box-shadow .25s, transform .25s', '&:hover':{boxShadow:'0 12px 42px -10px rgba(0,0,0,0.35)', transform:'translateY(-4px)'}, maxWidth:{xs:'400px', sm:'none'}, mx:{xs:'auto', sm:0}}}>
              {t.color!=='default' && <Chip label="Popular" size="small" color={t.color} sx={{position:'absolute', top:{xs:8, sm:12}, right:{xs:8, sm:12}, fontSize:{xs:'0.7rem', sm:'0.75rem'}}}/>}
              <CardContent sx={{p:{xs:2, sm:3}, display:'flex', flexDirection:'column', flexGrow:1}}>
                <Typography variant="h6" gutterBottom sx={{fontWeight:700, letterSpacing:.3, fontSize:{xs:'1.1rem', sm:'1.25rem'}}}>{t.title}</Typography>
                <Typography variant="h3" gutterBottom sx={{fontWeight:700, fontSize:{xs:'2rem', sm:'2.5rem', md:'3rem'}}}>{t.price}</Typography>
                <Typography variant="body2" sx={{mb:2, minHeight:{xs:40, sm:48}, fontSize:{xs:'0.85rem', sm:'0.875rem'}}}>{t.desc}</Typography>
                <List dense sx={{'& .MuiListItem-root':{alignItems:'flex-start', py:{xs:0.25, sm:0}}, flexGrow:1}}>
                  {t.features.map(f => (
                    <ListItem key={f} sx={{py:{xs:0.25, sm:0}}}>
                      <ListItemIcon sx={{minWidth:{xs:28, sm:32}}}><CheckIcon fontSize="small" color={t.color==='default'? 'success': t.color} /></ListItemIcon>
                      <ListItemText primaryTypographyProps={{variant:'caption', fontSize:{xs:'0.7rem', sm:'0.75rem'}}} primary={f} />
                    </ListItem>
                  ))}
                </List>
                <Button fullWidth size="large" variant={t.color==='default'? 'outlined':'contained'} color={t.color==='default'? 'primary':t.color} onClick={()=>checkout(t.plan)} aria-label={`Select ${t.title} plan`} sx={{mt:{xs:1.5, sm:2}, fontWeight:600, fontSize:{xs:'0.85rem', sm:'0.875rem'}, py:{xs:1, sm:1.5}}}>Select Plan</Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Typography variant="caption" display="block" align="center" sx={{mt:{xs:3, md:5}, opacity:.8, fontSize:{xs:'0.7rem', sm:'0.75rem'}}}>* Fair use limits apply.</Typography>
    </Box>
  );
}
