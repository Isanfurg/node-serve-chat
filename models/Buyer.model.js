import { Model } from "./base.js";
export class Buyer extends Model{
    get defaults(){
        return{
            id:"",
            name:""
        }
    }
}