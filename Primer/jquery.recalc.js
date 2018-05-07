/*
 * ReCalc - jQuery Plugin
 * Copyright (c) 2011 Roman Yuferov <exromany@gmail.com>
 * Special for http://promtk.com
 * 
 * exaple of using:
 * 
 *   <form id="calc_where"></form>
 *   <script>
 *   var calc = {
 *     1:{'title':'Скорость, V', 'unit_type':'m/sec', 'unit_def':1}, 
 *     2:{'title':'Время, t', 'unit_type':'sec', 'unit_def':1, 'def':10}, 
 *     3:{'title':'Расстояние, S','unit_type':'m'}, 
 *     'rules':{3:[1,2,'*']},
 *     'back': {1:[3,2,'/'], 2: [3,1,'/']}
 *   };
 *   
 *   $(document).ready(function(){
 *     $('#calc_where').recalc(calc);
 *   });
 * 
 */
 
(function( $ ){ 
  $.fn.recalc = function(obj_) {

    // индексация единиц измерения в подмассивах начинается с 0
    units = {  
      'm':{'title':'Длина', 'u': [['м',1],['мм',0.001],['дюйм',0.0254],['фут',0.3048]]},
      'm2':{'title':'Площадь', 'u': [['м&sup2;',1],['мм&sup2;',0.000001],['дюйм&sup2;',0.00064516],['фут&sup2;',0.09290304]]},
      'm3':{'title':'Объём', 'u': [['м&sup3;',1],['мм&sup3;',0.000000001],['литр',0.001],['дюйм&sup3;',0.000016387064],['фут&sup3;',0.028316846592]]},
      'kg':{'title':'Вес', 'u': [['кг',1],['г', 0.001],['т',1000]]},
      'kg/m3':{'title':'Плотность', 'u': [['кг/м&sup3;',1],['г/см&sup3;', 1000]]},
      'h':{'title':'Сила', 'u': [['H',1],['кгс', 9.80665]]},
      'pa':{'title':'Давление', 'u': [['Па',1],['МПа',1000000],['бар', 100000],['ат', 98066.5],['мм рт.ст.', 133.322]]},
      '1/min':{'title':'Частота', 'u': [['1/мин',1],['1/сек',60]]},
      'm3/day':{'title':'', 'u': [['м&sup3;/сут',1]]},
      'm/sec':{'title':'Скорость', 'u': [['м/с',1],['км/ч',0.277778]]},
      'sec':{'title':'Время', 'u': [['с',1],['ч',3600],['м',60]]}
    };
    
    // форматирует число
    // по умолчанию выводит 6 знаков после запятой
    numberFormat = function (_number,_decimal){
      var decimal=(typeof(_decimal)!='undefined')?_decimal:6;
      var r=parseFloat(_number)
      var exp10=Math.pow(10,decimal);
      r=Math.round(r*exp10)/exp10;
      return r;
    };
    
    // выводит значение
    outValue = function (v) {
      var k = obj[v].unit_type ? (units[ obj[v].unit_type ].u[ obj[v].unit ][1]) : 1;
      if (k == 0 || k == undefined ) k = 1;
      form.find('input#recalc_'+v).val($.isNumeric(obj[v].val) ? numberFormat(obj[v].val / k) : null);
    };

    // выводит все значения
    outValues = function() {
      for (var v in obj) outValue(v);
    }

    // производит расчет формулы, записанной в обратной польской натации
    OPN = function(rule) {
      var a = [];
      for (var c in rule) {   
        if (typeof(rule[c]) == 'number')
          a.push(obj[rule[c]].val);
        else {
          switch (rule[c]) {
            case '+' : a.push(a.pop() + a.pop()); break;
            case '-' : tmp = a.pop(); tmp2 = a.pop(); a.push(tmp2 - tmp); break;
            case '*' : a.push(a.pop() * a.pop()); break;
            case '/' : tmp = a.pop(); tmp2 = a.pop(); a.push(tmp2 / tmp); break;
            case '^' : tmp = a.pop(); a.push(tmp * tmp); break;
            case 'sqrt' : a.push(Math.sqrt(a.pop)); break;
            case 'pi' : a.push(Math.PI); break;
            default: a.push(parseFloat(rule[c]));
          };
        };
      };
      return a[0];
    }; 

    // определяет, нужно ли проводить перерасчет
    recalc_ = function(v, back_dir) {
      var _rules = back_dir ? obj[v].dep_back : obj[v].dep_rules;
      for (var i in _rules) {
        var o = _rules[i];
        var rule = back_dir ? back[o] : rules[o];
        var allReady = true;
        var allLock = true;
        for (var c in rule)
          if (typeof(rule[c]) == 'number') {
            if (!$.isNumeric(obj[rule[c]].val)) allReady = false;
            if (rule[c] != v) if (!obj[rule[c]].lock) allLock = false;
          };
        if (allReady && !obj[o].lock) {
          obj[o].val = OPN(rule);
          obj[o].from = v;
          outValue(o);
          check_vis(o);
          recalc_(o, back_dir);
        }
      };
    };
    
    // изменение единиц измерения
    setUnits = function(e) {
      var v = $(e).parent().attr('data-index');
      obj[v].unit = $(e)[0].selectedIndex;
      outValue(v);
    }
    
    // очищает значение переменной и той, которой была установлена
    clear_ = function(v, global) {
      obj[v].val = global ? null : obj[v].def || null;
      obj[v].lock = false;
      outValue(v);
      check_vis(v);
      if (!global)
        for (var i in obj)
          if (obj[i].from == v) clear_(i);
      obj[v].from = null;
    }
    
    // проверка необходимости кнопок Очисть и По умолчанию
    check_vis = function(v){
      var t = form.find('#recalc_'+v);
      if (obj[v].def && obj[v].val != obj[v].def) t.siblings('.default').addClass('vis');
      else t.siblings('.default').removeClass('vis');
      if (t.val().length) t.siblings('.clear').addClass('vis');
      else t.siblings('.clear').removeClass('vis');    
      if ( !$.isNumeric(obj[v].val) ) obj[v].lock = false;
      return false; // remove this
      if (obj[v].lock) t.siblings('.lock').addClass('locked');
      else t.siblings('.lock').removeClass('locked');
      if (obj[v].stop) t.parent().addClass('stop');
      else t.parent().removeClass('stop');
    };
    
    check_stop = function(v) {    
      function _check(v, back_dir) {
        var _rules = back_dir ? obj[v].dep_back : obj[v].dep_rules;
        for (var i in _rules) {
          var rule = back_dir ? back[_rules[i]] : rules[_rules[i]]
          var allLock = true;
          var _flag = false;
          for (var c in rule) {
            if (typeof(rule[c]) == 'number' && rule[c] != v) {
              if (!obj[rule[c]].lock) allLock = false;
              _flag = true;
            }              
            console.log(rule, rule[c], typeof(rule[c]), obj[rule[c]]);
          }
          obj[v].stop = _flag ? allLock : false;
          return obj[v].stop;
        }  
      }
      function check_one(v) {
        //obj[v].stop = true;
        _check(v);
        if (obj[v].stop) _check(v, true);
        check_vis(v);
        return obj[v].stop;
      }
      return false; // remove this
      if (v) return check_one(v);
      else
        for (var v in obj) {
          check_one(v);
          console.log('----:', v, 'is', obj[v].stop? 'stop' : 'free');
          }
    }

    // очистка
    clear = function(e) {
      var v = $(e).parent().attr('data-index');
      clear_(v);
    };
    
    // восстановление значения по умолчанию
    def_click = function(e){
      var v = $(e).parent().attr('data-index'); 
      var from = obj[v].from;
      obj[v].from = null;
      if (from) clear_(from);
      obj[v].val = obj[v].def;
      outValue(v);
      check_vis(v);
      recalc_(v);
      //recalc_(v, true);
    }
    
    lockToggle = function(e){
      var v = $(e).toggleClass('locked').parent().attr('data-index');
      var t = $(e).siblings('recalc_'+v);
      check_stop();
      obj[v].lock = !obj[v].lock;
      check_vis(v);
    };
    
    // при изменеии значения полей
    change = function(e) {
      var t = $(e);
      var v = t.parent().attr('data-index');    
      var k = obj[v].unit_type ? units[ obj[v].unit_type ].u[ obj[v].unit ][1] : 1;
      obj[v].from = null;
      obj[v].val = t.val() * k;
      //obj[v].lock = true;
      check_stop();  
      if (!obj[v].stop && $.isNumeric(t.val())) {
        check_vis(v);
        recalc_(v);
        //recalc_(v, true);
      } else
        clear(e);
    };
    
    // конвертер - выбор физической величины
    changeUnitType = function(si) {    
      var u = $($('#calc_conv_type').children()[si]).attr('data-unit');
      var str = '';
      for (var i in units[u].u)
        str += '<div data-index="'+i+'"><input type="number" min="0" id="calc_conv_'+i+'" /><span>'+units[u].u[i][0]+'</span></div>';
      str += '<div class="reset"><a class="vis">Очистить</a></div>';
      $('#calc_conv_content').html(str);
    }
    
    // конвертер - при вводе значения
    changeUnitValue = function(e) {
      var v = $(e).parent().attr('data-index');
      var u = $($('#calc_conv_type').children()[$('#calc_conv_type')[0].selectedIndex]).attr('data-unit'); 
      var val = $(e).val();
      var uni = units[u].u[v][1];
      console.log (uni);
      for (var i in units[u].u)
        if (i != v) {
          var k = units[u].u[i][1];
          if (k == 0 || k == undefined ) k = 1;
          form.find('input#calc_conv_'+i).val($.isNumeric(val) ? numberFormat(val * uni / k) : null);
        }
    }
    
    // инициация полей, переменных и т.д.
    init = function() {
      switch (mode) {
        // режим конвертера физических величин
        case 'conv': 
            var str = '';
            var ar = [];
            for (var i in units)
              if (units[i].title && units[i].u.length > 1) {
                str+= '<option data-unit="'+i+'">'+units[i].title+'</option>';
              }
            if (str) {
              var str = '<select class="conv type" id="calc_conv_type">' + str + '</select><div id="calc_conv_content"></div>';
              form.append(str)
                .on('change', 'select', function(){ changeUnitType(this.selectedIndex) })
                .on('keyup change input', 'input', function(){changeUnitValue(this)})
                .on('click', '.reset a', function(){ form.find('input').val(null); })
              changeUnitType(0);
            } else
              form.append('Массив единиц измерения не содержит подходящих записей');
          break;
        // обычный режим - расчет
        default:
          for (var v in obj) {
            var str = '<div data-index="'+v+'"><label for="recalc_'+v+'">'+(obj[v].title || 'Поле '+v)+'</label><input type="number" min="0" id="recalc_'+v+'" />';
            if (obj[v].unit_type) {
              str += '<select id="recalc_'+v+'_unit">';          
              for (var u in units[obj[v].unit_type].u)
                str += '<option>'+units[obj[v].unit_type].u[u][0]+'</option>';
              str += '</select>';
              obj[v].unit = obj[v].unit_def || 0;
            }
            //str += '<a class="vis lock calc_button" title="Зафиксировать значение"></a>';
            if (obj[v].def) str += '<a class="default calc_button" title="Восстановить значение по умолчанию"></a>';
            else str += '<a class="clear calc_button" title="Сбросить значение"></a></div>';
            form.append(str);
            obj[v].val = obj[v].def;
            obj[v].dep_rules = [];
            obj[v].dep_back = [];
            obj[v].lock = false;
            if (obj[v].unit_type) form.find('#recalc_'+v+'_unit')[0].selectedIndex = obj[v].unit;
          }; 
          // read rules
          for (var r in rules)
            for (var c in rules[r]) {
              var v = rules[r][c];
              if (typeof(v) == 'number') {
                obj[v].dep_rules.push(r);               
              }
            }
          // read back rules
          for (var r in back) 
            for (var c in back[r]) {
              var v = back[r][c];
              if (typeof(v) == 'number')
                obj[v].dep_back.push(r);
            }
          // назначение обработчиков событий
          form.append('<div class="reset"><a class="vis">Сбросить все</a></div>')
            .on('click', '.reset a', function(){ for (var i in obj) clear_(i); })
            .on('change', 'select', function(){setUnits(this)})
            .on('click', '.lock', function(){lockToggle(this)})
            .on('click', '.clear', function(){clear(this)})
            .on('click', '.default', function(){def_click(this)})
            .on('keyup change input', 'input', function(){change(this)});
          
          outValues();
        break;
      }
    }
    
    form =  $(this).html('');
    obj = obj_;
    rules = obj.rules;
    back = obj.back;
    mode = obj.mode;
    delete obj.mode;
    delete obj.rules;
    delete obj.back;
    init();
  }
})( jQuery );