var LibDB = /** @class */ (function () {
    function LibDB(nameLib, schema) {
        var _this_1 = this;
        this.name = nameLib;
        var creado, abrir = indexedDB.open(nameLib);
        if (localStorage.getItem('iniciado' + nameLib)) {
            creado = true;
        }
        else {
            creado = false;
        }
        if (creado === true) {
            var modificado = void 0;
            for (var _i = 0, schema_1 = schema; _i < schema_1.length; _i++) {
                var sche = schema_1[_i];
                if (localStorage.getItem(sche.nombre) === null) {
                    modificado = true;
                    break;
                }
                else {
                    if (localStorage.getItem(sche.nombre) !== JSON.stringify(sche.datos)) {
                        modificado = true;
                        break;
                    }
                }
            }
            if (modificado) {
                setTimeout(function () {
                    var version = abrir.result.version + 1;
                    abrir.result.close();
                    abrir = indexedDB.open(nameLib, version);
                    abrir.onupgradeneeded = function () {
                        var db = abrir.result;
                        for (var _i = 0, schema_2 = schema; _i < schema_2.length; _i++) {
                            var sche = schema_2[_i];
                            if (localStorage.getItem(sche.nombre)) {
                                var store = abrir.transaction.objectStore(sche.nombre), indicesCreados = store.indexNames;
                                var nameIndex = [];
                                for (var idx in indicesCreados) {
                                    nameIndex.push(indicesCreados[idx]);
                                }
                                for (var dts in sche.datos) {
                                    if (nameIndex.indexOf(dts) == -1) {
                                        store.createIndex(dts, dts, { unique: sche.datos[dts] });
                                    }
                                }
                            }
                            else {
                                localStorage.setItem(sche.nombre, JSON.stringify(sche.datos));
                                var store = db.createObjectStore(sche.nombre);
                                _this_1.crearIndex(store, sche.datos);
                            }
                        }
                        db.close();
                    };
                }, 70);
            }
        }
        else {
            localStorage.setItem('iniciado' + nameLib, 'Creado');
            abrir.onupgradeneeded = function () {
                var db = abrir.result;
                for (var _i = 0, schema_3 = schema; _i < schema_3.length; _i++) {
                    var sche = schema_3[_i];
                    localStorage.setItem(sche.nombre, JSON.stringify(sche.datos));
                    var store = db.createObjectStore(sche.nombre, { keyPath: 'key' });
                    _this_1.crearIndex(store, sche.datos);
                }
                db.close();
            };
        }
    }
    LibDB.prototype.crearIndex = function (store, datos) {
        for (var a in datos) {
            store.createIndex(a, a, { unique: datos[a] });
        }
    };
    LibDB.prototype.abrir = function () {
        var _this_1 = this;
        return new Promise(function (resolve) {
            var open = indexedDB.open(_this_1.name);
            open.onsuccess = function () {
                var db = open.result;
                resolve(db);
            };
        });
    };
    LibDB.prototype.crearKey = function () {
        //Metodo que genera los key cuando se ingresan datos a las colleciones
        return (Date.parse("" + new Date()).toString(36) +
            Math.random()
                .toString(36)
                .substr(2, 9));
    };
    LibDB.prototype.filtroDevolucion = function (datoDevol, resultado) {
        var arrayPed = Object.keys(datoDevol);
        for (var pedi in resultado) {
            if (arrayPed.indexOf(pedi) == -1) {
                delete resultado[pedi];
            }
        }
        return (resultado);
    };
    LibDB.prototype.filtrarIndice = function (datosFiltro, resultadoBusqueda) {
        var arrayDatos = Object.keys(datosFiltro);
        var _loop_1 = function (dat) {
            resultadoBusqueda = resultadoBusqueda.filter(function (resultReq) { return resultReq[dat] == datosFiltro[dat]; });
        };
        for (var _i = 0, arrayDatos_1 = arrayDatos; _i < arrayDatos_1.length; _i++) {
            var dat = arrayDatos_1[_i];
            _loop_1(dat);
        }
        return (resultadoBusqueda);
    };
    LibDB.prototype.sintesisFiltroDavolucion = function (ped, buscar) {
        var _this = this;
        function filtroGeneral(pedi, resultado) {
            if (pedi && pedi.$devol) {
                return _this.filtroDevolucion(pedi.$devol, resultado);
            }
            else {
                return resultado;
            }
        }
        if (buscar && buscar.length && buscar.length > 1) {
            var datos = [];
            for (var _i = 0, buscar_1 = buscar; _i < buscar_1.length; _i++) {
                var bus = buscar_1[_i];
                var g = filtroGeneral(ped, bus);
                datos.push(g);
            }
            return datos;
        }
        else {
            return filtroGeneral(ped, buscar);
        }
    };
    LibDB.prototype.post = function (nameObject, datos) {
        var _this_1 = this;
        datos.key = this.crearKey();
        return new Promise(function (resolve, reject) {
            _this_1.abrir().then(function (response) {
                var transaction = response.transaction(nameObject, 'readwrite'), objectStore = transaction.objectStore(nameObject), guardar = objectStore.add(datos);
                guardar.onsuccess = function () {
                    resolve(datos.key);
                    response.close();
                };
                guardar.onerror = function (err) {
                    resolve(err);
                    response.close();
                };
            });
        });
    };
    LibDB.prototype.postAll = function (nameObject, dats) {
        var _this_1 = this;
        return new Promise(function (resolve, reject) {
            _this_1.abrir().then(function (response) {
                var transaction = response.transaction(nameObject, 'readwrite'), objectStore = transaction.objectStore(nameObject);
                var _loop_2 = function (i) {
                    dats[i].key = _this_1.crearKey();
                    var guardar = objectStore.add(dats[i]);
                    guardar.onerror = function (err) {
                        reject({ error: err, fallo: dats[i] });
                    };
                    if (i === dats.length - 1) {
                        response.close();
                        resolve("completado");
                    }
                };
                for (var i = 0; i < dats.length; i++) {
                    _loop_2(i);
                }
            });
        });
    };
    LibDB.prototype.getOne = function (nameObject, ped) {
        var _this_1 = this;
        return new Promise(function (resolve, reject) {
            _this_1.abrir().then(function (res) {
                var transaction = res.transaction(nameObject, 'readonly'), almacen = transaction.objectStore(nameObject);
                if (ped.$dts.key) {
                    var buscar_2 = almacen.get(ped.$dts.key);
                    buscar_2.onerror = function () {
                        res.close();
                        reject(buscar_2.error);
                    };
                    buscar_2.onsuccess = function () {
                        var sintesis = _this_1.sintesisFiltroDavolucion(ped, buscar_2.result);
                        res.close();
                        resolve(sintesis);
                    };
                }
                else {
                    var nameFiltros = Object.keys(ped.$dts), indice = almacen.index(nameFiltros[0]);
                    if (nameFiltros.length == 0 || ped.$dts == null) {
                        res.close();
                        resolve('Debes ingresar datos de busqueda, de lo contrario utiliza el metodo get');
                    }
                    else if (nameFiltros.length == 1) {
                        var buscar_3 = indice.get(ped.$dts[nameFiltros[0]]);
                        buscar_3.onsuccess = function () {
                            var sintesis = _this_1.sintesisFiltroDavolucion(ped, buscar_3.result);
                            res.close();
                            resolve(sintesis);
                        };
                        buscar_3.onerror = function (err) { resolve(err); };
                    }
                    else {
                        var cursor = indice.openCursor(ped.$dts[nameFiltros[0]]), informacionObtenida_1 = [];
                        cursor.onsuccess = function (e) {
                            var data = e.target.result;
                            if (data) {
                                informacionObtenida_1.push(data.value);
                                data["continue"]();
                            }
                            else {
                                var buscar = _this_1.filtrarIndice(ped.$dts, informacionObtenida_1);
                                var sintesis = _this_1.sintesisFiltroDavolucion(ped, buscar[0]);
                                res.close();
                                resolve(sintesis);
                            }
                        };
                    }
                }
            });
        });
    };
    LibDB.prototype.get = function (nameObject, ped) {
        var _this_1 = this;
        return new Promise(function (resolve, reject) {
            _this_1.abrir().then(function (res) {
                var transaction = res.transaction(nameObject, 'readonly'), almacen = transaction.objectStore(nameObject);
                if (ped && ped.$dts) {
                    var indicesFiltro = Object.keys(ped.$dts), indice = almacen.index(indicesFiltro[0]), cursor = indice.openCursor(ped.$dts[indicesFiltro[0]]), informacionObtenida_2 = [];
                    cursor.onsuccess = function (e) {
                        var data = e.target.result;
                        if (data) {
                            informacionObtenida_2.push(data.value);
                            data["continue"]();
                        }
                        else {
                            var buscar = _this_1.filtrarIndice(ped.$dts, informacionObtenida_2), sintesis = _this_1.sintesisFiltroDavolucion(ped, buscar);
                            res.close();
                            resolve(sintesis);
                        }
                    };
                    cursor.onerror = function (err) {
                        reject(err);
                    };
                }
                else {
                    var buscar_4 = almacen.getAll();
                    buscar_4.onsuccess = function () {
                        res.close();
                        resolve(_this_1.sintesisFiltroDavolucion(ped, buscar_4.result));
                    };
                }
            });
        });
    };
    LibDB.prototype.put = function (nameObject, recursos) {
        var _this_1 = this;
        return new Promise(function (resolve, reject) {
            _this_1.getOne(nameObject, { $dts: recursos.$dts, $devol: false }).then(function (response) {
                _this_1.abrir().then(function (res) {
                    var transaction = res.transaction(nameObject, 'readwrite'), almacen = transaction.objectStore(nameObject);
                    if (recursos.$unds) {
                        var c = Object.assign(response, recursos.$modif);
                        var modificar = almacen.put(c);
                        modificar.onsuccess = function () {
                            res.close();
                            resolve('modificado');
                        };
                        modificar.onerror = function (err) {
                            res.close();
                            reject(err);
                        };
                    }
                    else {
                        var a = { key: response.key }, c_1 = Object.assign(a, recursos.$modif);
                        var modificar = almacen.put(c_1);
                        modificar.onsuccess = function () {
                            res.close();
                            resolve('modificado');
                        };
                        modificar.onerror = function (err) {
                            res.close();
                            reject(err);
                        };
                    }
                });
            });
        });
    };
    LibDB.prototype.putAll = function (nameObject, recursos) {
        var _this_1 = this;
        return new Promise(function (resolve, reject) {
            for (var _i = 0, _a = recursos.$dts; _i < _a.length; _i++) {
                var td = _a[_i];
                if (recursos.$unds) {
                    _this_1.put(nameObject, { $dts: td, $unds: recursos.$unds, $modif: recursos.$modif })
                        .then(function (res) { return console.log('modificado'); })["catch"](function (err) { return reject(err); });
                }
                else {
                    _this_1.put(nameObject, { $dts: td, $unds: false, $modif: recursos.$modif })
                        .then(function (res) { return console.log('modificado'); })["catch"](function (err) { return resolve(err); });
                }
            }
            resolve('completado');
        });
    };
    LibDB.prototype["delete"] = function (nameObject, recursos) {
        var _this_1 = this;
        return new Promise(function (resolve, reject) {
            _this_1.getOne(nameObject, { $dts: recursos.$dts, $devol: { key: true } }).then(function (response) {
                _this_1.abrir().then(function (res) {
                    var transaction = res.transaction(nameObject, 'readwrite'), almacen = transaction.objectStore(nameObject), eliminar = almacen["delete"](response.key);
                    eliminar.onsuccess = function () {
                        resolve('Eliminado: ' + response.key);
                    };
                    eliminar.onerror = function (err) {
                        reject(err);
                    };
                });
            });
        });
    };
    LibDB.prototype.deleteAll = function (nameObject, recursos) {
        var _this_1 = this;
        return new Promise(function (resolve, reject) {
            for (var _i = 0, _a = recursos.$dts; _i < _a.length; _i++) {
                var td = _a[_i];
                _this_1["delete"](nameObject, { $dts: td })
                    .then(function (res) { return console.log('eliminado'); })["catch"](function (err) { return resolve(err); });
            }
            resolve('completado');
        });
    };
    LibDB.prototype.eliminarContent = function (nombreCollections) {
        var _this_1 = this;
        return new Promise(function (resolve, reject) {
            _this_1.abrir().then(function (res) {
                var transaction = res.transaction(nombreCollections), almacen = transaction.objectStore(nombreCollections), resultado = almacen.clear();
                resultado.onsuccess = function (e) {
                    resolve("Eliminado");
                };
                resultado.onerror = function (err) {
                    reject(err);
                };
            });
        });
    };
    return LibDB;
}());