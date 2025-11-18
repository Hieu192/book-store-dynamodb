var elasticlunr = require('elasticlunr');
var datap=require("../data/products")
module.exports=function Search(keyword,data){
    try{
    var index = elasticlunr(function () {
        this.addField('name')
        this.addField('description')
        this.addField('category')
        this.setRef('_id');
    });
    
    for(var i=0;i<data.length;i++){
        const obj={
            _id:data[i]._id,
            name:data[i].name,
            description:data[i].description,
            category:data[i].category,
        }
        index.addDoc(obj);
    }
    
}
    catch(err){
        console.log(err)
    }
    return index.search(keyword,{
        fields: {
            name: {boost: 3},
            description: {boost: 2},
            category: {boost: 1}
        }
    });
}