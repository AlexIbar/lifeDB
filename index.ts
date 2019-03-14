//Interfaces
interface pasoSchema{
    nombre:string,
    [datos:string]:any
}
interface entradaGet{
    $dts:any,
    $devol:any
}
interface entradaDelete{
    $dts:any,
}
interface entradaUpdate{
    $dts:any,
    $unds:any,
    $modif:any
}
class LibDB{
    name:string
    constructor(nameLib:string, schema:Array<pasoSchema>){
        this.name=nameLib
        let creado:boolean,
            abrir = indexedDB.open(nameLib)
        if(localStorage.getItem('iniciado'+nameLib)){
            creado = true
        }else{
            creado=false
        }
        if(creado === true){
               let modificado:boolean;
            for(let sche of schema){
                if(localStorage.getItem(sche.nombre) === null){
                    modificado = true
                    break
                }else{
                    if(localStorage.getItem(sche.nombre) !== JSON.stringify(sche.datos)){
                        modificado=true;
                        break
                    }
                }
            }
            if(modificado){
                setTimeout(()=>{
                    let version =abrir.result.version+1;
                    abrir.result.close()
                    abrir = indexedDB.open(nameLib,version)
                    abrir.onupgradeneeded = ()=>{
                        let db = abrir.result
                        for(let sche of schema){
                            if(localStorage.getItem(sche.nombre)){
                                let store = abrir.transaction.objectStore(sche.nombre),
                                indicesCreados = store.indexNames;
                                let nameIndex=[]
                                for(let idx in indicesCreados){
                                    nameIndex.push(indicesCreados[idx])
                                }
                                for(let dts in sche.datos){
                                    if(nameIndex.indexOf(dts) == -1){
                                        store.createIndex(dts,dts, {unique:sche.datos[dts]})
                                    }
                                }
                            }else{
                                localStorage.setItem(sche.nombre, JSON.stringify(sche.datos))
                                let store = db.createObjectStore(sche.nombre)
                                this.crearIndex(store, sche.datos)
                            }
                        }
                        db.close()
                    }
                },70)
            }
        }else{
            localStorage.setItem('iniciado'+nameLib, 'Creado');
            abrir.onupgradeneeded = ()=>{
                var db = abrir.result;
                for(let sche of schema){
                    localStorage.setItem(sche.nombre, JSON.stringify(sche.datos))
                    let store = db.createObjectStore(sche.nombre, {keyPath:'key'});
                    this.crearIndex(store, sche.datos)
                }
                db.close()
            }
        }
    }
    crearIndex(store, datos){
        for(let a in datos){
            store.createIndex(a, a, {unique: datos[a]})
        }
    }
    abrir(){
        return new Promise((resolve)=>{
            let open =indexedDB.open(this.name)
            open.onsuccess = function(){
                let db = open.result
                resolve(db)
            }
        })
    }
    crearKey() {
        //Metodo que genera los key cuando se ingresan datos a las colleciones
        return (
          Date.parse("" + new Date()).toString(36) +
          Math.random()
            .toString(36)
            .substr(2, 9)
        );
    }
    filtroDevolucion(datoDevol:any, resultado:any){
        let arrayPed = Object.keys(datoDevol)
        for(let pedi in resultado){
            if(arrayPed.indexOf(pedi) == -1){
                delete resultado[pedi]
            }
        }
        return(resultado)
    }
    filtrarIndice(datosFiltro:any, resultadoBusqueda:any){
        let arrayDatos = Object.keys(datosFiltro)
        for(let dat of arrayDatos){
            resultadoBusqueda = resultadoBusqueda.filter((resultReq)=>resultReq[dat] == datosFiltro[dat])
        }
        return(resultadoBusqueda)
    }
    sintesisFiltroDavolucion(ped:any, buscar:any){
        let _this = this
        function filtroGeneral(pedi, resultado){
            if(pedi && pedi.$devol){
                return _this.filtroDevolucion(pedi.$devol, resultado)
            }else{
                return resultado
            }
        }
        if(buscar && buscar.length && buscar.length>1){
            let datos =[]
            for(let bus of buscar){
                let g = filtroGeneral(ped, bus)
                datos.push(g)
            }
            return datos
        }else{
            return filtroGeneral(ped, buscar)
        }
    }
    post(nameObject:string,datos:any){
        datos.key = this.crearKey()
        return new Promise((resolve,reject)=>{
            this.abrir().then((response:any)=>{
                let transaction = response.transaction(nameObject, 'readwrite'),
                objectStore =transaction.objectStore(nameObject),
                guardar =objectStore.add(datos)
                guardar.onsuccess=function(){
                    resolve(datos.key)
                    response.close()
                }
                guardar.onerror=function(err){
                    resolve(err)
                    response.close()
                }
            })
        })
    }
    postAll(nameObject:string, dats:Array<any>){
        return new Promise((resolve, reject)=>{
            this.abrir().then((response:any)=>{
                let transaction = response.transaction(nameObject,'readwrite'),
                    objectStore = transaction.objectStore(nameObject)
                for (let i = 0; i < dats.length; i++) {
                    dats[i].key = this.crearKey();
                    let guardar = objectStore.add(dats[i]);
                    guardar.onerror = function(err) {
                        reject({error:err, fallo:dats[i]});
                    };
                    if (i === dats.length - 1) {
                        response.close();
                        resolve("completado");
                    }
                }
            })
        })
    }
    getOne(nameObject:string, ped:entradaGet){
        return new Promise((resolve,reject)=>{
            this.abrir().then((res:any)=>{
                let transaction = res.transaction(nameObject, 'readonly'),
                almacen = transaction.objectStore(nameObject);
                if(ped.$dts.key){
                    let buscar =almacen.get(ped.$dts.key)
                    buscar.onerror=function(){
                        res.close()
                        reject(buscar.error)
                    }
                    buscar.onsuccess=()=>{
                        let sintesis =this.sintesisFiltroDavolucion(ped,buscar.result)
                        res.close()
                        resolve(sintesis)
                    }
                }else{
                    let nameFiltros = Object.keys(ped.$dts),
                        indice =almacen.index(nameFiltros[0]);
                    if(nameFiltros.length == 0 || ped.$dts == null){
                        res.close()
                        resolve('Debes ingresar datos de busqueda, de lo contrario utiliza el metodo get')
                    }else if(nameFiltros.length == 1){
                        let buscar = indice.get(ped.$dts[nameFiltros[0]]);
                        buscar.onsuccess =()=>{
                            let sintesis =this.sintesisFiltroDavolucion(ped,buscar.result)
                            res.close()
                            resolve(sintesis)
                        }
                        buscar.onerror=function(err:any){ resolve(err) }
                    }else{
                        let cursor = indice.openCursor(ped.$dts[nameFiltros[0]]),
                        informacionObtenida=[];
                        cursor.onsuccess=(e:any)=>{
                            let data = e.target.result;
                            if(data){
                                informacionObtenida.push(data.value)
                                data.continue();
                            }else{
                                let buscar =this.filtrarIndice(ped.$dts, informacionObtenida)
                                let sintesis =this.sintesisFiltroDavolucion(ped,buscar[0])
                                res.close()
                                resolve(sintesis)
                            }
                        }
                    }
                }
            })
        })
    }
    get(nameObject:string, ped:entradaGet){
        return new Promise((resolve,reject)=>{
            this.abrir().then((res:any)=>{
                let transaction =res.transaction(nameObject, 'readonly'),
                almacen = transaction.objectStore(nameObject);
                if(ped && ped.$dts){
                    let indicesFiltro = Object.keys(ped.$dts),
                        indice = almacen.index(indicesFiltro[0]),
                        cursor = indice.openCursor(ped.$dts[indicesFiltro[0]]),
                        informacionObtenida = [];
                    cursor.onsuccess=(e:any)=>{
                        let data = e.target.result;
                        if(data){
                            informacionObtenida.push(data.value)
                            data.continue()
                        }else{
                            let buscar =this.filtrarIndice(ped.$dts, informacionObtenida),
                                sintesis =this.sintesisFiltroDavolucion(ped,buscar);
                            res.close()
                            resolve(sintesis)
                        }
                    }
                    cursor.onerror=function(err){
                        reject(err)
                    }
                }else{
                    let buscar = almacen.getAll()
                    buscar.onsuccess = ()=>{
                        res.close()
                        resolve(this.sintesisFiltroDavolucion(ped,buscar.result))
                    }
                }
            })
        })
    }
    put(nameObject:string, recursos:entradaUpdate){
        return new Promise((resolve,reject)=>{
            this.getOne(nameObject, {$dts:recursos.$dts,$devol:false}).then((response:any)=>{
                this.abrir().then((res:any)=>{
                    let transaction = res.transaction(nameObject, 'readwrite'),
                    almacen=transaction.objectStore(nameObject);
                    if(recursos.$unds){
                        var c = Object.assign(response,recursos.$modif);
                        let modificar =almacen.put(c)
                        modificar.onsuccess=function(){
                            res.close()
                            resolve('modificado')
                        }
                        modificar.onerror=function(err){
                            res.close()
                            reject(err)
                        }
                    }else{
                        let a = {key:response.key},
                            c= Object.assign(a,recursos.$modif)
                        let modificar =almacen.put(c)
                        modificar.onsuccess=function(){
                            res.close()
                            resolve('modificado')
                        }
                        modificar.onerror=function(err){
                            res.close()
                            reject(err)
                        }
                    }
                })
            })
        })
    }
    putAll(nameObject:string, recursos:entradaUpdate){
        return new Promise((resolve,reject)=>{
            for(let td of recursos.$dts){
                if(recursos.$unds){
                    this.put(nameObject, {$dts:td, $unds:recursos.$unds, $modif:recursos.$modif})
                    .then(res=>console.log('modificado')).catch(err=>reject(err))
                }else{
                    this.put(nameObject, {$dts:td, $unds:false, $modif:recursos.$modif})
                    .then(res=>console.log('modificado')).catch(err=>resolve(err))
                }
            }
            resolve('completado')
        })
    }
    delete(nameObject:string,recursos:entradaDelete){
        return new Promise((resolve,reject)=>{
            this.getOne(nameObject,{$dts:recursos.$dts,$devol:{key:true}}).then((response:any)=>{
                this.abrir().then((res:any)=>{
                    let transaction = res.transaction(nameObject, 'readwrite'),
                        almacen =transaction.objectStore(nameObject),
                        eliminar = almacen.delete(response.key)
                    eliminar.onsuccess=()=>{
                        resolve('Eliminado: '+response.key)
                    }
                    eliminar.onerror =function(err){
                        reject(err)
                    }
                })
            })
        })
    }
    deleteAll(nameObject:string,recursos:entradaDelete){
        return new Promise((resolve,reject)=>{
            for(let td of recursos.$dts){
                this.delete(nameObject, {$dts:td})
                .then(res=>console.log('eliminado')).catch(err=>resolve(err))
            }
            resolve('completado')
        })
    }
    eliminarContent(nombreCollections: string) {
        return new Promise((resolve, reject) => {
            this.abrir().then((res:any)=>{
                let transaction = res.transaction(nombreCollections),
                    almacen = transaction.objectStore(nombreCollections),
                    resultado = almacen.clear();
                resultado.onsuccess = (e: any) => {
                    resolve("Eliminado");
                };
                resultado.onerror = function(err){
                    reject(err)
                }
            })
        });
    }
}