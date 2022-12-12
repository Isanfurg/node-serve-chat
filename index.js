import  express from 'express';
import morgan from "morgan";
import {Server} from 'socket.io';
import http from 'http';
import cors from 'cors';
import mariadb from 'mariadb';

import {PORT} from './config.js';
import { time } from 'console';
import {Producto} from './models/producto.model.js';
import {Auction } from './models/auction.model.js';
import { Buyer } from './models/Buyer.model.js';
var rooms = []
var connected = []

async function asyncConnection() {
    
    const conn = mariadb.createConnection({
        host:'4.227.201.55',
        user:'backend',
        password:'backend',
        database: 'subastas'
    });
    return conn;
}
async function getProducts(){
    let res = await conn.query(
        "SELECT * from producto;")
    delete res.meta;
    return res;
}
async function addProd(data,id){
    let res = await conn.query(
        "INSERT INTO producto (id,name,price,actual_price,state,url,buyer) VALUES ('"+id+"','"+data.name+"','"+data.price+"','"+0+"','"+data.state+"','"+data.url+"');"
    )
    console.log(res)
}
async function updateProduct(newPrice,id,name){
    let res = await conn.query(
        "UPDATE producto SET price = "+newPrice+", actual_price = "+newPrice+", buyer = '"+name+"' WHERE id = "+id+";"
    )
}
async function saveConnection(userName){
    let res = await conn.query(
        "INSERT INTO connected (username,date) VALUES ('"+userName+"','"+ (new Date).toString().slice(0,24) +"');"
    )
}
async function sellProduct(id){
    let res = await conn.query(
        "Update producto set state = "+'"SUBASTADO"'+" where id = "+id+";"
    )
    console.log(res)
}
const conn = await asyncConnection();
let products = await getProducts();

const app = express();
const server = http.createServer(app);
const io = new Server(server,{
    cors:{
        origin: '*'
    }
});

products.forEach(e => {
    var p = new Producto({
        id: e.id,
        price: e.price,
        actual_price: e.actual_price,
        state: e.state,
        name: e.name,
        url: e.url,
    })
    var room = new Auction({
        product: p,
    })
    rooms.push(room)
});
var sockets =[]
io.on('connection',(socket)=>{
    sockets.push(socket)
    var buyer = new Buyer()
    socket.on('username', async (data) => {
        await saveConnection(data);
        var res = await getProducts();
      
        socket.emit('products',res); 
        buyer=new Buyer({
            id: socket.id,
            name: data
        })
        if(buyer.name!=="MARTILLERO"){
            connected.push(buyer);
        }
        console.log("Users connected: "+connected.length)
    })
    socket.on('getLogs',async() => {
        
        var res = await getProducts();
      
        socket.emit('logs',res); 
        
    })
    socket.on('joinAuction', async (data) => {
        console.log(buyer)
        rooms.forEach(room => {
            if(room.product.id === data){
                console.log(buyer.name + " se unio a la puja por " + room.product.name)
                if(room.socket===""){
                    room.socket = socket;
                }
                room.joinRoom(buyer)
                socket.emit("joinRoom",{
                    product:room.product,
                    inRoom:room.inRoom
                });
                room.inRoom.forEach(e => {
                    io.to(e.id).emit("userJoinRoom",buyer.name)
                });
            }
        })
    })
   
    socket.on('leftRoom', async (data) => {
        console.log(buyer)
        rooms.forEach(async room => {
            if(room.product.id === data){
                console.log(buyer.name + " abandono la puja por " + room.product.name)
                if(room.socket===""){
                    room.socket = socket;
                }
                room.leaveRoom(buyer)
                var res = await getProducts()
                socket.emit('products',res)
                room.inRoom.forEach(e => {
                    io.to(e.id).emit("userLeftRoom",buyer.name)
                });
            }
        })
    })

    
    socket.on('puja', async (data) => {
        var res = await getProducts()
        res.forEach(product => {
            if(product.id === data.id){
                if(data.price > product.price){
                    updateProduct(data.price,data.id,buyer.name)
                    rooms.forEach(room => {
                        room.inRoom.forEach(e => {
                            io.to(e.id).emit("nuevaPuja",{
                                user: buyer.name,
                                monto: data.price
                            })
                        });
                    })
                }
            }
        })
    })

    socket.on('addProduct', async (data) => {
        var res = await getProducts()
        console.log(res);
        await addProd(data,(res.length+1));
        var a = await getProducts();
        socket.emit('products',a); 
    })

    socket.on('sendMsg', async (data) => {
        console.log(data)
        rooms.forEach(room => {
            room.inRoom.forEach(e => {
                io.to(e.id).emit("alert",data)
            });
        })
    })

    socket.on('alertPuja', async (data) => {
        console.log(data)
        rooms.forEach(room => {
            room.inRoom.forEach(e => {
                io.to(e.id).emit("endPuja",data)
            });
        })
        sellProduct(data)
    })

    socket.on("disconnect", (reason) => {
            if(buyer.id!==""){
                connected = connected.filter((item)=>item.id!== buyer.id)
                sockets = sockets.filter((item)=>item.id!== buyer.id)
            }
            rooms.forEach(room =>{
                room.leaveRoom(buyer,sockets)
            })
 
            console.log(buyer.name +" abandono el servidor");
        });

    }
)

server.listen(PORT);
console.log('Server started on: localhost:',PORT);
