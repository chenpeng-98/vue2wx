// [参考](https://cloud.tencent.com/developer/article/1500414)
const fs = require('fs');
const path = require('path');
const compiler = require('vue-template-compiler')

// css --> wxss
const postcss = require('postcss');
const less = require('postcss-less-engine-latest');
const clean = require('postcss-clean');
const rem2rpx = require('postcss-rem2rpx');

// js转化
const babel = require('babel-core');
const types = require('babel-types'); // types就是用来构造一个新的node节点的

// 生成json文件
const circularJSON = require('circular-json');

// 读取vue文件
const vueFileContent = fs.readFileSync('../src/component/activity/20210418/venueNav.vue', 'utf8');
const sfc = compiler.parseComponent(vueFileContent);


// 将styles数组中的content合并成一个字符串
const stylesSting = sfc.styles.reduce((pre, cur) => { return pre + cur.content.trim() + '\n' }, '');
postcss([
  less({ strictMath: true }),
  rem2rpx({ rootFontSize: 50 }),
  // clean()
])
  .process(
    stylesSting,
    {
      parser: less.parser,
      from: undefined
    })
  .then((result) => {
    fs.writeFileSync('./dist/res-style.wxss', result.css);
  }, (err) => {
    console.log('error:', err);
  });


const babelrc = path.resolve('./.babelrc') //拿到本地的 babelrc 的配置
const scriptContent = sfc.script.content // 拿到解析后的sfc中的script部分的源代码

// 配置一个 parseImportVisitor
const parseImportVisitor = {
  "ImportSpecifier|ImportDefaultSpecifier"(path) {
    const currentName = path.node.local.name // 获取import进来的名称，比如上图中script的基本结构的 TransferDom， XDialog， stars
    const parentPath = path.findParent((path) => path.isImportDeclaration()); //找到当前节点的 ImportDeclaration 类型父节点
    const [ExportDefaultDeclaration] = parentPath.container.filter(item => item.type === 'ExportDefaultDeclaration') //通过父节点去找到 ExportDefaultDeclaration 类型的节点，就是export default中代码
    const { properties } = ExportDefaultDeclaration.declaration // 获取 export default 中所有属性
    const [directivesProperty] = properties.filter(item => item.key.name === 'directives')
    if (directivesProperty) {
      const { properties } = directivesProperty.value // directives中的属性值
      // 遍历 directives 中的属性值
      properties.forEach(p => {
        const value = p.value.name || p.value.value
        if (value === currentName) {
          // 如果在 directives中找到了和当前import进来的名字一样的，就需要把当前的节点删除
          // 比如 import { TransferDom, XDialog } from 'vux'; 删除后会变成 import { XDialog } from 'vux'; 
          path.remove()
          if (!parentPath.node.specifiers.length) {
            //如果父节点为空，需要把父节点也完全删除
            path.parentPath.remove()
          }
        }
      })
    }
    // 上面对 directives 的处理是直接删除  
    // 下面对 components 的处理则需要保存起来，主要是保存在 path.hub.file 中的 metadata 中  
    const { metadata } = path.hub.file
    const [componentsProperty] = properties.filter(item => item.key.name === 'components')
    const usingComponents = { ...metadata.usingComponents }
    //创建一个 usingComponents 对象  
    if (componentsProperty) {
      const { properties } = componentsProperty.value // 获取 components 中的属性值     
      // 遍历 components 中的属性值  
      properties.forEach(p => {
        const value = p.value.name || p.value.value
        if (value === currentName) {
          // 如果在 components 中找到了和当前import进来的名字一样的，就需要把当前的节点放入 usingComponents 中，然后删除      
          usingComponents[value] = parentPath.node.source.value
          path.remove()
          if (!parentPath.node.specifiers.length) {
            //如果父节点为空，需要把父节点也完全删除       
            path.parentPath.remove()
          }
        }
      })
    }
    metadata.usingComponents = usingComponents
  },
  "ImportSpecifier|ImportDefaultSpecifier"(path) {
    const currentName = path.node.local.name // 获取import进来的名称，比如上图中script的基本结构的 TransferDom， XDialog， stars
    const parentPath = path.findParent((path) => path.isImportDeclaration()); //找到当前节点的 ImportDeclaration 类型父节点   
    const [ExportDefaultDeclaration] = parentPath.container.filter(item => item.type === 'ExportDefaultDeclaration') //通过父节点去找到 ExportDefaultDeclaration 类型的节点，就是export default中代码   
    const { properties } = ExportDefaultDeclaration.declaration // 获取 export default 中所有属性
    const [directivesProperty] = properties.filter(item => item.key.name === 'directives')
    if (directivesProperty) {
      const { properties } = directivesProperty.value // directives中的属性值      // 遍历 directives 中的属性值  
      properties.forEach(p => {
        const value = p.value.name || p.value.value
        if (value === currentName) {          // 如果在 directives中找到了和当前import进来的名字一样的，就需要把当前的节点删除        
          // 比如 import { TransferDom, XDialog } from 'vux'; 删除后会变成 import { XDialog } from 'vux';    
          path.remove()
          if (!parentPath.node.specifiers.length) { //如果父节点为空，需要把父节点也完全删除     
            path.parentPath.remove()
          }
        }
      })
    }        // 上面对 directives 的处理是直接删除    // 下面对 components 的处理则需要保存起来，主要是保存在 path.hub.file 中的 metadata 中   
    const { metadata } = path.hub.file
    const [componentsProperty] = properties.filter(item => item.key.name === 'components')
    const usingComponents = { ...metadata.usingComponents } //创建一个 usingComponents 对象  
    if (componentsProperty) {
      const { properties } = componentsProperty.value // 获取 components 中的属性值   
      // 遍历 components 中的属性值   
      properties.forEach(p => {
        const value = p.value.name || p.value.value
        if (value === currentName) {
          // 如果在 components 中找到了和当前import进来的名字一样的，就需要把当前的节点放入 usingComponents 中，然后删除  
          usingComponents[value] = parentPath.node.source.value
          path.remove()
          if (!parentPath.node.specifiers.length) { //如果父节点为空，需要把父节点也完全删除     
            path.parentPath.remove()
          }
        }
      })
    }
    metadata.usingComponents = usingComponents
  },
}


const parseExportDefaultVisitor = {
  ExportDefaultDeclaration: function (path) {
    // 这里拦截 ExportDefaultDeclaration  
    // 这里只处理 ExportDefaultDeclaration， 就是把export default 替换成 Page 或者 Component  
    // 其它都交给 traverseJsVisitor 处理  
    path.traverse(traverseJsVisitor)
    // 把export default 替换成 Page 或者 Component   
    const { metadata } = path.hub.file
    const { declaration } = path.node
    const newArguments = [declaration]
    const name = metadata.isComponent ? 'Component' : 'Page'
    const newCallee = types.identifier(name)
    const newCallExpression = types.CallExpression(newCallee, newArguments)
    path.replaceWith(newCallExpression)
  }
}

const traverseJsVisitor = {
  Identifier(path) {
    const { metadata } = path.hub.file    // 替换 props  
    if (path.node.name === 'props') {
      metadata.isComponent = true //在这里判断当前文件是否是一个组件
      const name = types.identifier('properties') //创建一个标识符    
      path.replaceWith(name) // 替换掉当前节点   
    }
    if (path && path.node.name === 'created') {
      let name
      if (metadata.isComponent) {
        //判断是否是组件    
        name = types.identifier('attached')
        //创建一个标识符   
      } else {
        name = types.identifier('onLoad')
        //创建一个标识符   
      }
      path.replaceWith(name) // 替换掉当前节点 
    }
    if (path && path.node.name === 'mounted') {
      let name
      if (metadata.isComponent) {
        //判断是否是组件    
        name = types.identifier('ready') //创建一个标识符   
      } else {
        name = types.identifier('onReady') //创建一个标识符  
      }
      path.replaceWith(name) // 替换掉当前节点  
    }
    if (path && path.node.name === 'destroyed') {
      let name
      if (metadata.isComponent) {
        //判断是否是组件    
        name = types.identifier('detached') //创建一个标识符   
      } else {
        name = types.identifier('onUnload') //创建一个标识符    
      }
      path.replaceWith(name) // 替换掉当前节点  
    }
  },
  // 处理method
  ObjectProperty: function (path) {
    const { metadata } = path.hub.file
    //是否是组件，如果是则不动， 如果不是，则用 methods 中的多个方法一起来替换掉当前的 methods节点  
    if (path && path.node && path.node.key.name === 'methods' && !metadata.isComponent) {
      path.replaceWithMultiple(path.node.value.properties);
      return;
    }
    // 删除 name directives components  
    if (path.node.key.name === 'name' || path.node.key.name === 'directives' || path.node.key.name === 'components') {
      path.remove();
      return;
    }
  },
  // 将this.xxx 转换成 this.data.xxx 
  MemberExpression(path) {
    // 拦截 MemberExpression   
    const { object, property } = path.node
    if (object.type === 'ThisExpression' && property.name !== 'data') {
      const container = path.container
      if (container.type === 'CallExpression') {
        return;
      }
      if (property.name === '$router') {
        return;
      }
      // 将 this.xx 转换成 this.data.xx     
      const dataProperty = types.identifier('data')
      const newObject = types.memberExpression(object, dataProperty, false)
      const newMember = types.memberExpression(newObject, property, false)
      path.replaceWith(newMember)
    }
  },
  // 将 this.xx == xx 转换成 this.setData
  AssignmentExpression(path) {
    // 拦截 AssignmentExpression  
    const leftNode = path.node.left
    const { object, property } = leftNode
    if (leftNode.type === 'MemberExpression' && leftNode.object.type === 'ThisExpression') {
      const properties = [types.objectProperty(property, path.node.right, false, false, null)]
      const arguments = [types.objectExpression(properties)]
      const object = types.thisExpression()
      const setDataProperty = types.identifier('setData')
      const callee = types.memberExpression(object, setDataProperty, false)
      const newCallExpression = types.CallExpression(callee, arguments)
      path.replaceWith(newCallExpression)
    }
  },
  // 处理 props中的default；把 data 函数转换为 data 属性；处理watch
  ObjectMethod: function (path) {
    // 替换 props 中 的defalut   
    if (path && path.node && path.node.key.name === 'default') {
      const parentPath = path.findParent((path) => path.isObjectProperty());
      const propsNode = parentPath.findParent((findParent) => findParent.isObjectExpression()).container
      if (propsNode.key.name === 'properties') {
        const key = types.identifier('value')
        const value = path.node.body.body[0].argument
        const newNode = types.objectProperty(key, value, false, false, null)
        path.replaceWith(newNode)
      }
    }
    if (path && path.node.key.name === 'data') {
      const key = types.identifier('data')
      const value = path.node.body.body[0].argument
      const newNode = types.objectProperty(key, value, false, false, null)
      path.replaceWith(newNode)
    }
    // TODO WATCH
    // if (path && path.node && path.node.key.name === 'created') {
    //   const watchIndex = path.container.findIndex(item => item.key.name === 'watch')
    //   const watchItemPath = path.getSibling(watchIndex)
    //   if (watchItemPath) {
    //     const { value } = watchItemPath.node
    //     const arguments = [types.thisExpression(), value]
    //     const callee = types.identifier('Watch')
    //     const newCallExpression = types.CallExpression(callee, arguments)
    //     path.get('body').pushContainer('body', newCallExpression);
    //     watchItemPath.remove()
    //   }
    //   return;
    // }
  },
  // 处理 router 路由跳转 
  CallExpression(path) {
    const { arguments, callee } = path.node
    const { object, property } = callee
    if (object && object.type === 'MemberExpression' && object.property.name === '$router') {
      //拦截到$router   
      const properties = arguments[0].properties      // vue里面这里只能获取到 路由名称，但是小程序需要的是page页面的路径，这里就没有做转换了，直接拿了路由名称充当小程序跳转的url，到时候手动改   
      const [nameInfo] = properties.filter(item => item.key.name === 'name')
      const [paramsInfo] = properties.filter(item => item.key.name === 'params') //拿到router的params参数     
      const [queryInfo] = properties.filter(item => item.key.name === 'query') //拿到router的query参数
      // 把params和query的参数都合并到一个数组当中去，然后 map 出 key 和 value    
      const paramsValue = paramsInfo && paramsInfo.value
      const queryValue = queryInfo && queryInfo.value
      const paramsValueList = paramsValue && paramsValue.properties ? paramsValue.properties : []
      const queryValueList = queryValue && queryValue.properties ? queryValue.properties : []
      const paramsItems = [].concat(paramsValueList, queryValueList).map(item => ({ key: item.key, value: item.value }))
      const url = types.identifier('url') // 创建一个 叫做 url 的标识符     
      const routeName = nameInfo.value.value // 跳转的路由名称         
      let expressions, quasis
      if (paramsItems.some(item => types.isCallExpression(item.value) || types.isMemberExpression(item.value))) {
        const expressionList = paramsItems.filter(item => types.isCallExpression(item.value) || types.isMemberExpression(item.value))
        const literalList = paramsItems.filter(item => types.isLiteral(item.value))
        // 把参数都合并成一个字符串       
        const templateElementLastItem = literalList.reduce((finalString, cur) => {
          return `${finalString}&${cur.key.name}=${cur.value.value}`
        }, '')
        const templateElementItemList = expressionList.map((item, index) => {
          if (index === 0) {
            return `${routeName}?${item.key.name}=`
          }
          return `&${item.key.name}=`
        })
        expressions = expressionList.map(item => item.value)
        quasis = [...templateElementItemList, templateElementLastItem].map(item => {
          return types.templateElement({ raw: item, cooked: item }, false)
        })
      }
      const newTemplateLiteral = types.templateLiteral(quasis, expressions) //创建一个 templateLiteral   
      const objectProperty = types.objectProperty(url, newTemplateLiteral, false, false, null)
      // 构造一个CallExpression   
      let newPoperty
      if (property.name === 'replace') {
        newPoperty = types.identifier('redirectTo')
      }
      if (property.name === 'push') {
        newPoperty = types.identifier('navigateTo')
      }
      const newArguments = [types.objectExpression([objectProperty])]
      const newObject = types.identifier('wx')
      const newCallee = types.memberExpression(newObject, newPoperty, false)
      const newCallExpression = types.CallExpression(newCallee, newArguments)
      path.replaceWith(newCallExpression)
    }
  }
}

const babelOptions = {
  extends: babelrc,
  plugins: [
    { visitor: parseImportVisitor },
    { visitor: parseExportDefaultVisitor }
  ]
}
const result = babel.transform(scriptContent, babelOptions)
fs.writeFileSync('./dist/res-js.js', result.code.trim());

// 生成json文件
const jsonFile = {
  component: result.metadata.isComponent ? true : undefined,
  usingComponents: result.metadata.usingComponents  // 取出 metadata中的usingComponents
}
fs.writeFileSync('./dist/res-json.json', circularJSON.stringify(jsonFile, null, 2)); // 写到 json 文件中

// 生成wxml文件
const astTplRes = compiler.compile(
  sfc.template.content,
  {
    comments: true,
    preserveWhitespace: false,
    shouldDecodeNewlines: true
  }).ast;

const handleTag = function ({ attrsMap, tag }) {
  let stringExpression = ''
  if (attrsMap) {
    stringExpression = handleAttrsMap(attrsMap)
  }
  return `<${tag} ${stringExpression}>`
}
const generateStartTag = function (node) {
  let startTag
  const { tag, attrsMap, type, isComment, text } = node
  // 如果是注释 
  if (type === 3) {
    startTag = isComment ? `<!-- ${text} -->` : text
    return startTag;
  }
  // 如果是表达式节点 
  if (type === 2) {
    startTag = text.trim()
    return startTag;
  }
  switch (tag) {
    case 'div':
    case 'p':
    case 'span':
    case 'em':
      startTag = handleTag({ tag: 'view', attrsMap });
      break;
    case 'img':
      startTag = handleTag({ tag: 'image', attrsMap });
      break;
    case 'template':
      startTag = handleTag({ tag: 'block', attrsMap });
      break;
    default:
      startTag = handleTag({ tag, attrsMap });
  }
  return startTag
}

// 这个函数是处理 AttrsMap，把 AttrsMap 的所有值 合并成一个字符串
const handleAttrsMap = function (attrsMap) {
  let stringExpression = ''
  stringExpression = Object.entries(attrsMap).map(([key, value]) => {
    // 替换 bind 的 :  
    if (key.charAt(0) === ':') {
      return `${key.slice(1)}="{{${value}}}"`
    }
    // 统一做成 bindtap  
    if (key === '@click') {
      const [name, params] = value.split('(')
      let paramsList
      let paramsString = ''
      if (params) {
        paramsList = params.slice(0, params.length - 1).replace(/\'|\"/g, '').split(',')
        paramsString = paramsList.reduce((all, cur) => {
          return `${all} data-${cur.trim()}="${cur.trim()}"`
        }, '')
      }
      return `bindtap="${name}"${paramsString}`
    }
    if (key === 'v-model') {
      return `value="{{${value}}}"`
    }
    if (key === 'v-if') {
      return `wx:if="{{${value}}}"`
    }
    if (key === 'v-else-if') {
      return `wx:elif="{{${value}}}"`
    }
    if (key === 'v-else') {
      return `wx:else`
    }
    if (key === 'v-for') {
      const [params, list] = value.split('in ')
      const paramsList = params.replace(/\(|\)/g, '').split(',')
      const [item, index] = paramsList
      const indexString = index ? ` wx:for-index="${index.trim()}"` : ''
      return `wx:for="{{${list.trim()}}}" wx:for-item="${item.trim()}"${indexString}`
    }
    return `${key}="${value}"`
  }).join(' ')
  return stringExpression
}


const generateEndTag = function (node) {
  let endTag
  const { tag, attrsMap, type, isComment, text } = node
  // 如果是表达式节点或者注释 
  if (type === 3 || type === 2) {
    endTag = ''
    return endTag;
  }
  switch (tag) {
    case 'div':
    case 'p':
    case 'span':
    case 'em':
      endTag = '</view>'
      break;
    case 'img':
      endTag = '</image>'
      break;
    case 'template':
      endTag = '</block>'
      break;
    default:
      endTag = `</${tag}>`
  }
  return endTag
}
// 递归生成 首尾标签
const generateTag = function (node) {
  let children = node.children
  // 如果是if表达式 需要做如下处理  
  if (children && children.length) {
    let ifChildren
    const ifChild = children.find(subNode => subNode.ifConditions && subNode.ifConditions.length)
    if (ifChild) {
      const ifChildIndex = children.findIndex(subNode => subNode.ifConditions && subNode.ifConditions.length)
      ifChildren = ifChild.ifConditions.map(item => item.block)
      delete ifChild.ifConditions
      children.splice(ifChildIndex, 1, ...ifChildren)
    }
    children.forEach(function (subNode) {
      generateTag(subNode)
    })
  }
  node.startTag = generateStartTag(node)
  // 生成开始标签 
  node.endTag = generateEndTag(node)
  //生成结束标签
}
const handleTagsTree = function (topTreeNode) {
  // 为每一个节点生成开始标签和结束标签  
  generateTag(topTreeNode)
  return createWxml(topTreeNode)
};

// 递归生成 所需要的文本
const createWxml = function (node) {
  let templateString = '';
  const { startTag, endTag, children } = node
  let childrenString = ''
  if (children && children.length) {
    childrenString = children.reduce((allString, curentChild) => {
      const curentChildString = createWxml(curentChild)
      return `${allString}\n${curentChildString}\n`
    }, '')
  }
  return `${startTag}${childrenString}${endTag}`
}
const wxml = handleTagsTree(astTplRes);
fs.writeFileSync('./dist/res.wxml', wxml.trim());


// 这里有一点需要注意的是watch的处理，因为小程序没有watch，所以我在小程序手写了一个简单watch
// 而且小程序中的watch需要放在onLoad或者attached生命周期中。
// 以下两个函数实现watch 未实现deep功能
const Watch = (ctx, obj) => {
  Object.keys(obj).forEach((key) => {
    defineProperty(ctx.data, key, ctx.data[key], (value) => {
      obj[key].call(ctx, value);
    });
  });
};
const defineProperty = (data, key, val, fn) => {
  Object.defineProperty(
    data,
    key,
    {
      configurable: true,
      enumerable: true,
      get() { return val; },
      set(newVal) {
        if (newVal === val) return;
        if (fn) fn(newVal);
        val = newVal;
      },
    });
};