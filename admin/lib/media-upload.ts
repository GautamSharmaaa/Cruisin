import {api} from './api';
export const uploadPublicMedia=async(file:File):Promise<string>=>{
 const form=new FormData();form.append('file',file);form.append('visibility','public');const response=await api.post<{data:{_id:string}}>('/admin/operations/media',form);const base=new URL(String(api.defaults.baseURL??'/api/v1'),window.location.origin).toString().replace(/\/$/,'');return `${base}/media/${response.data.data._id}/content`;
};
