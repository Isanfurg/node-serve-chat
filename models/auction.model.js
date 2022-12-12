import { Model } from "./base.js";
import { Buyer } from "./Buyer.model.js";
export class Auction extends Model{
    get defaults(){
        return{
            product: null,
            inRoom: [],            
        }
    }
    joinRoom(buyer,sockets){
      
      
        this.inRoom.push(buyer)
        
    }
    leaveRoom(buyer,sockets){
        this.inRoom = this.inRoom.filter((item)=> item.id !== buyer.id)
       
        
    }

}