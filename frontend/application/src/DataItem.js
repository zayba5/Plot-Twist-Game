export class DataItem{
    constructor(itemJSON){
        this.text = itemJSON.text
    }

    getText(){
        return this.text
    }
}