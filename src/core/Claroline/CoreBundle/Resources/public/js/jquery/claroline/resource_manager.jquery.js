/*
 * dependencies: dynatree, contextualMenu, jquery, some templates.
 */
$(function(){
    var jsonmenu = {};
    var jsonroots = '';
    $.fn.extend({
        claroResourceManager: function(options){
            var params = $.extend({
                mode: 'manager',
                displayMode: 'classic',
                checkbox: true,
                resourcePickedHandler: function (resourceId){
                    alert("DEFAULT SUBMIT HANDLER MUST BE CHANGED")
                }
            }, options);
            return this.each(function(){

                var moveForm = Twig.render(move_resource_form);
                createDivTree($(this));
                ClaroUtils.sendRequest(
                    Routing.generate('claro_resource_menus'),
                    function(data){
                        jsonmenu = JSON.parse(data);
                        if('picker' == params.mode){
                            for (var menu in jsonmenu) {
                                delete jsonmenu[menu].items['delete'];
                                delete jsonmenu[menu].items['properties'];
                            }
                            delete jsonmenu['directory'];
                        }
                    },
                    function(){
                        ClaroUtils.sendRequest(Routing.generate('claro_resource_roots'),
                            function(data){
                                jsonroots = data;
                                createTree('#source_tree');
                                }
                            )
                        })

                    function createDivTree(div) {
                    var content = ""
                    +"<div id='ct_form'></div><br>"
                    +"<div id='ct_mode'><button id='ct_switch_mode'>switch mode</button></div><br>"
                    +"<div id='source_tree'></div>";

                    if (true == params.checkbox) {
                        content+="<br><button id='ct_download'>download</button>";
                        $('#ct_download').live('click', function(){
                            var children = $('#source_tree').dynatree('getTree').getSelectedNodes();
                            var parameters = {};

                            for (var i in children) {
                                if(children[i].isTool != true) {
                                    parameters[i] = children[i].data.instanceId;
                                }
                            }

                            parameters['displayMode'] = params.displayMode;
                            window.location = Routing.generate('claro_multi_export', parameters);
                        })
                    }

                    div.append(content);
                    $('#ct_switch_mode').click(function(){
                        (params.displayMode == 'classic') ? params.displayMode = 'linker': params.displayMode = 'classic';
                        (params.displayMode == 'classic') ? params.checkbox = true: params.checkbox = false;
                        destroyMenus();
                        $('#source_tree').dynatree('destroy');

                        $('#source_tree').empty();
                        createTree('#source_tree');
                    });


                }

                function destroyMenus() {
                      $('.dynatree-title').each(function() {
                            var selector = '#'+this.id;
                            $.contextMenu('destroy', selector);
                      });

                      $('.dynatree-custom-claro-menu').each(function() {
                            var selector = '#'+this.id;
                            $.contextMenu('destroy', selector);
                      });
                }

                function createTree(treeId)
                {
                    var initChildren = function (){

                        var children = {};
                        if (params.displayMode == 'classic') {
                            children = eval(jsonroots);
                        } else {
                            children = [];
                        }
                        return children;
                    }

                    var onLazyReadUrl = function(node){
                        var url = '';
                        (params.displayMode == 'classic') ? url = Routing.generate('claro_resource_children', {'instanceId': node.data.instanceId})
                        : url = Routing.generate('claro_resources_list', {'resourceTypeId':node.parent.data.id, 'rootId':node.data.instanceId});
                        return url;
                    }

                    var initLinker = function(){
                        ClaroUtils.sendRequest(Routing.generate('claro_resource_types'), function(data){
                            //JSON.parse not working: why ?
                            var resourceTypes = eval(data);
                            var root = $(treeId).dynatree('getTree').getRoot();
                            for(var i in resourceTypes){
                                var node = {
                                    "id": resourceTypes[i].id,
                                    "key": resourceTypes[i].type,
                                    "title": resourceTypes[i].type,
                                    "tooltip":  resourceTypes[i].type,
                                    "shareType": 1,
                                    "isFolder": true,
                                    "isLazy": false,
                                    "isTool": true
                                }
                                root.addChild(node);

                                var rootChildren = eval(jsonroots);

                                $(treeId).dynatree('getTree').getNodeByKey(resourceTypes[i].type).addChild(rootChildren);
                                rootChildren = $(treeId).dynatree('getTree').getNodeByKey(resourceTypes[i].type).getChildren();
                                for (var k in rootChildren) {
                                    rootChildren[k].data.type = 'type_'+resourceTypes[i].type;
                                    rootChildren[k].data.key = 'type_'+resourceTypes[i].type;
                                    bindContextMenuTree(rootChildren[k]);
                                }

                            }
                        })
                    };

                    function dropNode(node, sourceNode, hitMode)
                    {
                        $('#ct_form').empty().append(moveForm);
                        $('#move_resource_form_submit').click(function (e) {
                            e.preventDefault();
                            var option = ClaroUtils.getCheckedValue(document.forms['move_resource_form']['options']);
                            var route = {}

                            if ('move' == option) {
                                route = {
                                    'name': 'claro_resource_move',
                                    'parameters': {
                                        'instanceId': sourceNode.data.instanceId,
                                        'newParentId': node.data.instanceId
                                    }
                                };
                                ClaroUtils.sendRequest(route);
                                sourceNode.move(node, hitMode);
                                $('#ct_form').empty();
                            } else {
                                route = {
                                    'name': 'claro_resource_add_workspace',
                                    'parameters': {
                                        'resourceId': sourceNode.data.resourceId,
                                        'instanceDestinationId': node.data.instanceId,
                                        'options': option
                                    }
                                }
                                ClaroUtils.sendRequest(route);
                                var newNode = {
                                    title: sourceNode.data.title,
                                    key: sourceNode.data.key,
                                    copy: sourceNode.data.copy,
                                    instanceCount: sourceNode.data.instanceCount,
                                    shareType: sourceNode.data.shareType,
                                    resourceId: sourceNode.data.resourceId,
                                    isFolder: sourceNode.data.isFolder,
                                    instanceId: sourceNode.data.instanceId,
                                    isLazy: true
                                }
                                node.addChild(newNode);
                                $('#ct_form').empty();
                            }
                        });
                    }

                    var bindContextMenuTree = function(node){
                        var type = node.data.type;
                        var menuDefaultOptions = {
                            selector: '#node_'+ node.data.key,
                            callback: function (key, options) {
                                findMenuObject(jsonmenu[type], node, key);
                            }
                        }

                        menuDefaultOptions.items = jsonmenu[type].items;
                        $.contextMenu(menuDefaultOptions);
                        var additionalMenuOptions = $.extend(menuDefaultOptions, {
                            selector: '#dynatree-custom-claro-menu-' + node.data.key,
                            trigger: 'left'
                        });

                        $.contextMenu(additionalMenuOptions);

                        var executeMenuActions = function(obj, node)
                        {
                            var submissionHandler = function(xhr){
                                if (xhr.getResponseHeader('Content-Type') == 'application/json') {
                                    var JSONObject = JSON.parse(xhr.responseText);
                                    var instance = JSONObject[0];
                                    var newNode = {
                                        title: instance.title,
                                        key: instance.key,
                                        copy: instance.copy,
                                        instanceCount: instance.instanceCount,
                                        shareType: instance.shareType,
                                        resourceId: instance.resourceId
                                    }

                                    if (instance.type == 'directory') {
                                        newNode.isFolder = true;
                                    }

                                    if (node.data.instanceId != newNode.instanceId) {
                                        node.appendAjax({ url: onLazyReadUrl(node)})
                                        node.expand();
                                    } else {
                                        node.data.title = newNode.title;
                                        node.data.shareType = newNode.shareType;
                                        node.render();
                                    }
                                    $('#ct_tree').show();
                                    $('#ct_form').empty();
                                } else {
                                    $('#ct_form').empty().append(xhr.responseText).find('form').submit(function (e) {
                                        e.preventDefault();
                                        var action = $('#ct_form').find('form').attr('action');
                                        action = action.replace('_instanceId', node.data.instanceId);
                                        action = action.replace('_resourceId', node.data.resourceId);
                                        var id = $('#ct_form').find('form').attr('id');
                                        ClaroUtils.sendForm(action, document.getElementById(id), submissionHandler);
                                    });
                                }
                            }

                            var executeAsync = function (obj, node, route) {
                                var removeNode = function () {
                                    ClaroUtils.sendRequest(route, function (data, textStatus, jqXHR) {
                                        if (204 == jqXHR.status) {
                                            node.remove();
                                        }
                                    });
                                }

                                var executeRequest = function () {
                                    ClaroUtils.sendRequest(route, function (data) {
                                        $('#ct_tree').hide();
                                        if(node.data.isTool == true){
                                            $('#modal-body').append(Twig.render(select_workspace_form));
                                            $('#modal-body').append('he');
                                            $('#bootstrap-modal').modal('show');
                                        }
                                        $('#ct_form').empty().append(data).find('form').submit(function (e) {
                                            e.preventDefault();
                                            var action = $('#ct_form').find('form').attr('action');
                                            action = action.replace('_instanceId', node.data.instanceId);
                                            var id = $('#ct_form').find('form').attr('id');
                                            ClaroUtils.sendForm(action, document.getElementById(id), submissionHandler);
                                        });
                                    })
                                }

                                switch (obj.name) {
                                    case 'delete':
                                        removeNode(node, route);
                                        break;
                                    default:
                                        executeRequest (node, route);
                                        break;
                                }
                            }

                            var route = obj.route;
                            var compiledRoute = route.replace('_instanceId', node.data.instanceId);
                            compiledRoute = compiledRoute.replace('_resourceId', node.data.resourceId);
                            obj.async ? executeAsync(obj, node, compiledRoute): window.location = compiledRoute;
                        }

                        var findMenuObject = function(items, node, menuItem)
                        {
                            for (var property in items.items) {
                                if (property == menuItem) {
                                    executeMenuActions(items.items[property], node);
                                } else {
                                    if (items.items[property].hasOwnProperty('items')) {
                                        findMenuObject(items.items[property], node, menuItem);
                                    }
                                }
                            }
                        }
                    }

                    var children = initChildren();

                    $(treeId).dynatree({
                        checkbox: true,
                        title: 'myTree',
                        children: children,
                        onPostInit: function(isReloading, isError){
                            if(params.displayMode == 'linker'){
                                initLinker(treeId);
                            }
                        },
                        clickFolderMode: 1,
                        selectMode: 3,
                        onLazyRead: function (node) {
                            node.appendAjax({
                                url: onLazyReadUrl(node),
                                success: function (node) {
                                    var children = node.getChildren();

                                    if (node.isSelected()){
                                        for (var i in children) {
                                            children[i].select();
                                        }
                                    }
                                },
                                error: function (node, XMLHttpRequest, textStatus, errorThrown) {
                                    if (XMLHttpRequest.status == 403) {
                                        ClaroUtils.ajaxAuthenticationErrorHandler(function () {
                                            window.location.reload();
                                        });
                                    } else {
                                        alert('this node could not be loaded');
                                    }
                                }
                            });
                        },
                        onCreate: function (node, span) {
                            if (node.data.hasOwnProperty('type')) {
                                if(undefined != jsonmenu[node.data.type]){
                                    bindContextMenuTree(node);
                                }
                            }
                        },
                        onDblClick: function (node) {
                            if (params.mode == 'picker' && node.data.type != 'resourceType'){
                                (node.shareType == 0) ? alert("you can't share this resource"): params.resourcePickedHandler(node.data.resourceId);
                            } else {
                                node.expand();
                                node.activate();
                            }
                        },
                        onCustomRender: function (node) {
                            var customTitle = '';
                            var html = "<a id='node_"+node.data.key+"' class='dynatree-title' style='cursor:pointer;' title='"+node.data.tooltip+"'href='#'> "+node.data.title+"</a>";
                            html += "<span class='dynatree-custom-claro-menu' id='dynatree-custom-claro-menu-"+node.data.key+"' style='cursor:pointer; color:blue;'> menu </span>";
                            return html;
                        },
                        dnd: {
                            onDragStart: function (node) {
                                if(params.mode == 'picker' || params.displayMode == 'linker'){
                                    return false;
                                }
                            },
                            onDragStop: function (node) {
                            },
                            autoExpandMS: 1000,
                            preventVoidMoves: true,
                            onDragEnter: function (node, sourceNode) {
                                return true;
                            },
                            onDragOver: function (node, sourceNode, hitMode) {
                                if (node.isDescendantOf(sourceNode)) {
                                    return false;
                                }
                            },
                            onDrop: function (node, sourceNode, hitMode, ui, draggable) {
                                if (node.isDescendantOf(sourceNode)) {
                                    return false;
                                }
                                else {/*
                                    if(sourceNode.data.shareType == 0){
                                        alert('this resource is private');
                                        return false;
                                    }*/

                                    dropNode(node, sourceNode, hitMode);
                                }
                            }
                        }
                    });
                }
                return(this);
            })
        }

    })
});