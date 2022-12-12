import { Model } from "./base.js";

export class Producto extends Model{
    get defaults(){
        return{
            id:"",
            name: "",
            state: "",
            price: "",
            actual_price: "",
            url: "",
            buyer: ""
        }
    }
    
    
}