export const esc=(value)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const id=()=>('id-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8));
