/*! version : 4.17.47-dayjs-1.0.0
 =========================================================
 bootstrap-datetimepicker (Day.js edition)
 https://github.com/Eonasdan/bootstrap-datetimepicker
 Original Copyright (c) 2015 Jonathan Peterson
 Day.js port: moment → dayjs full replacement
 =========================================================
 */
/*
 The MIT License (MIT)
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:
 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
*/

/*
 =========================================================
 [Day.js 마이그레이션 노트]

 필수 Day.js 플러그인 (페이지에 반드시 로드):
   - dayjs/plugin/customParseFormat   → 커스텀 포맷 파싱
   - dayjs/plugin/localeData          → localeData(), weekdaysMin() 등
   - dayjs/plugin/weekOfYear          → .week()
   - dayjs/plugin/isBetween           → .isBetween()
   - dayjs/plugin/isSameOrBefore      → .isSameOrBefore()
   - dayjs/plugin/isSameOrAfter       → .isSameOrAfter()
   - dayjs/plugin/advancedFormat      → 고급 포맷 토큰 (Q, Do, X, x 등)
   - dayjs/plugin/utc                 → UTC 지원
   - dayjs/plugin/timezone            → 타임존 지원 (options.timeZone 사용 시)
   - dayjs/plugin/updateLocale        → locale 업데이트

 CDN 예시:
   <script src="https://cdn.jsdelivr.net/npm/dayjs/dayjs.min.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/dayjs/plugin/customParseFormat.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/dayjs/plugin/localeData.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/dayjs/plugin/weekOfYear.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/dayjs/plugin/isBetween.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/dayjs/plugin/isSameOrBefore.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/dayjs/plugin/isSameOrAfter.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/dayjs/plugin/advancedFormat.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/dayjs/plugin/utc.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/dayjs/plugin/timezone.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/dayjs/plugin/updateLocale.js"></script>

 [moment → dayjs 주요 차이점 및 처리 방식]
   - moment()          → dayjs()
   - moment.isMoment() → _isDayjs()  (내부 헬퍼)
   - moment.isDate()   → (d instanceof Date)
   - moment.tz()       → dayjs().tz() (timezone 플러그인 필요)
   - .locale(str)      → dayjs 전역 locale 변경 후 .locale(str) 인스턴스 적용
   - .localeData()     → dayjs.localeData() (localeData 플러그인)
   - .longDateFormat() → _longDateFormat() 내부 폴리필로 처리
   - .week()           → weekOfYear 플러그인으로 지원
   - .isBetween()      → isBetween 플러그인으로 지원
   - .startOf('w')     → Day.js 는 'week' 또는 'w' 모두 지원
   - moment({ y: })    → dayjs().year(n)  (객체 생성자 미지원 → _dayjsFromObject() 폴리필)
   - .format('L')      → localeData 기반 longDateFormat 폴리필 처리
   - .clone()          → dayjs 는 immutable이므로 clone() 지원하지만 명시적 처리
 =========================================================
*/

(function (factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define(['jquery', 'dayjs'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('jquery'), require('dayjs'));
    } else {
        if (typeof jQuery === 'undefined') {
            throw 'bootstrap-datetimepicker requires jQuery to be loaded first';
        }
        if (typeof dayjs === 'undefined') {
            throw 'bootstrap-datetimepicker requires Day.js to be loaded first';
        }
        factory(jQuery, dayjs);
    }
}(function ($, dayjs) {
    'use strict';

    if (!dayjs) {
        throw new Error('bootstrap-datetimepicker requires Day.js to be loaded first');
    }

    // =========================================================
    // Day.js 플러그인 자동 등록 (전역에 이미 로드된 경우)
    // =========================================================
    (function _registerPlugins() {
        var pluginNames = [
            'customParseFormat', 'localeData', 'weekOfYear',
            'isBetween', 'isSameOrBefore', 'isSameOrAfter',
            'advancedFormat', 'utc', 'timezone', 'updateLocale'
        ];
        pluginNames.forEach(function (name) {
            if (window && window.dayjs_plugin) {
                // Webpack/번들 환경에서 전역 노출된 경우 자동 extend
            }
            // CDN 환경: window.dayjs_plugin_customParseFormat 등으로 노출됨
            var globalKey = 'dayjs_plugin_' + name;
            if (typeof window !== 'undefined' && window[globalKey]) {
                try { dayjs.extend(window[globalKey]); } catch (e) {}
            }
        });
    }());

    // =========================================================
    // [Polyfill] moment API → dayjs 호환 레이어
    // =========================================================

    /**
     * dayjs 인스턴스 여부 판별
     * moment.isMoment() 대체
     */
    function _isDayjs(d) {
        return d && typeof d === 'object' && d.$d instanceof Date;
    }

    /**
     * moment({ y: 2000 }) 스타일 객체 생성자 폴리필
     * dayjs 는 객체 리터럴 생성자를 지원하지 않음
     */
    function _dayjsFromObject(obj) {
        // obj: { y: 2000 } 또는 { year: 2000, month: 0, date: 1 } 등
        var d = dayjs();
        if (obj.y !== undefined)    { d = d.year(obj.y); }
        if (obj.year !== undefined) { d = d.year(obj.year); }
        if (obj.M !== undefined)    { d = d.month(obj.M); }
        if (obj.month !== undefined){ d = d.month(obj.month); }
        if (obj.d !== undefined)    { d = d.date(obj.d); }
        if (obj.date !== undefined) { d = d.date(obj.date); }
        if (obj.h !== undefined)    { d = d.hour(obj.h); }
        if (obj.hour !== undefined) { d = d.hour(obj.hour); }
        if (obj.m !== undefined)    { d = d.minute(obj.m); }
        if (obj.minute !== undefined){ d = d.minute(obj.minute); }
        if (obj.s !== undefined)    { d = d.second(obj.s); }
        if (obj.second !== undefined){ d = d.second(obj.second); }
        return d.startOf('second');
    }

    /**
     * locale 기반 longDateFormat 폴리필
     * moment의 .localeData().longDateFormat('L') 대체
     * Day.js localeData 플러그인은 longDateFormat을 지원하나,
     * 토큰 중첩 해석이 필요하므로 내부 처리
     */
    function _longDateFormat(token, locale) {
        try {
            var ld = dayjs.localeData ? dayjs.localeData() : null;
            if (ld && typeof ld.longDateFormat === 'function') {
                return ld.longDateFormat(token) || token;
            }
        } catch (e) {}

        // 폴리필 기본값 (en 기준)
        var formats = {
            LT:   'h:mm A',
            LTS:  'h:mm:ss A',
            L:    'MM/DD/YYYY',
            LL:   'MMMM D, YYYY',
            LLL:  'MMMM D, YYYY h:mm A',
            LLLL: 'dddd, MMMM D, YYYY h:mm A',
            l:    'M/D/YYYY',
            ll:   'MMM D, YYYY',
            lll:  'MMM D, YYYY h:mm A',
            llll: 'ddd, MMM D, YYYY h:mm A'
        };
        return formats[token] || token;
    }

    /**
     * dayjs 인스턴스에 locale 적용 헬퍼
     * moment의 d.locale('ko') 대체
     */
    function _applyLocale(d, locale) {
        if (!locale) { return d; }
        if (typeof d.locale === 'function') {
            return d.locale(locale);
        }
        return d;
    }

    /**
     * dayjs 인스턴스의 weekday (0=Sunday) 반환
     * moment의 .day() 대체 — dayjs는 .day()로 동일하게 지원
     */
    function _weekday(d) {
        return d.day(); // 0=Sun, 6=Sat
    }

    /**
     * .isBetween() 폴리필
     * dayjs isBetween 플러그인 미로드 시 대비
     */
    function _isBetween(d, a, b) {
        if (typeof d.isBetween === 'function') {
            return d.isBetween(a, b);
        }
        return d.isAfter(a) && d.isBefore(b);
    }

    /**
     * .isSameOrBefore() 폴리필
     */
    function _isSameOrBefore(d, other, granularity) {
        if (typeof d.isSameOrBefore === 'function') {
            return d.isSameOrBefore(other, granularity);
        }
        return d.isSame(other, granularity) || d.isBefore(other, granularity);
    }

    /**
     * .isSameOrAfter() 폴리필
     */
    function _isSameOrAfter(d, other, granularity) {
        if (typeof d.isSameOrAfter === 'function') {
            return d.isSameOrAfter(other, granularity);
        }
        return d.isSame(other, granularity) || d.isAfter(other, granularity);
    }

    /**
     * .week() 폴리필 (weekOfYear 플러그인 미로드 시 대비)
     */
    function _week(d) {
        if (typeof d.week === 'function') {
            return d.week();
        }
        // ISO week number 수동 계산 폴리필
        var startOfYear = d.startOf('year');
        return Math.ceil((d.diff(startOfYear, 'day') + startOfYear.day() + 1) / 7);
    }

    /**
     * startOf('w') → Day.js는 'week' 또는 'w' 지원 확인
     * weekOfYear 플러그인 없이는 startOf('week') 동작이 다를 수 있음
     */
    function _startOfWeek(d) {
        // Day.js 기본: startOf('week')은 locale 기준 (일요일 기준)
        return d.startOf('week');
    }

    /**
     * endOf('w') 폴리필
     */
    function _endOfWeek(d) {
        return d.endOf('week');
    }

    /**
     * format 문자열에서 locale 기반 LT/L/LL 등 확장 토큰 처리
     * moment의 initFormatting 내 replace 로직 대체
     */
    function _resolveFormat(format) {
        // LTS, LT, L, LL, LLL, LLLL, l, ll, lll, llll 토큰 치환
        return format.replace(/(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g, function (token) {
            if (/^\[.*\]$/.test(token)) { return token; } // 이스케이프된 대괄호 무시
            var resolved = _longDateFormat(token);
            // 중첩 토큰도 한 번 더 해석
            return resolved.replace(/(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g, function (t2) {
                if (/^\[.*\]$/.test(t2)) { return t2; }
                return _longDateFormat(t2);
            });
        });
    }

    /**
     * locale 이름으로 localeData 검증 폴리필
     * moment.localeData(locale) 대체
     * dayjs는 locale 로드 여부 직접 확인 불가 → try/catch
     */
    function _hasLocale(locale) {
        try {
            var current = dayjs.locale();
            dayjs.locale(locale);
            var ok = dayjs.locale() === locale;
            dayjs.locale(current); // 되돌리기
            return ok;
        } catch (e) {
            return false;
        }
    }

    /**
     * dayjs 인스턴스에서 weekdays 단축명(dd) 반환
     * moment의 .format('dd') 대체 — dayjs advancedFormat + localeData 필요
     */
    function _formatDd(d) {
        // Day.js advancedFormat 플러그인 있으면 그냥 format('dd')
        // 없으면 ddd를 잘라서 2자 반환
        try {
            return d.format('dd');
        } catch (e) {
            return d.format('ddd').substring(0, 2);
        }
    }

    // =========================================================
    // 메인 플러그인
    // =========================================================

    var dateTimePicker = function (element, options) {
        var picker = {},
            date,
            viewDate,
            unset = true,
            input,
            component = false,
            widget = false,
            use24Hours,
            minViewModeNumber = 0,
            actualFormat,
            parseFormats,
            currentViewMode,
            datePickerModes = [
                { clsName: 'days',    navFnc: 'M',  navStep: 1   },
                { clsName: 'months',  navFnc: 'y',  navStep: 1   },
                { clsName: 'years',   navFnc: 'y',  navStep: 10  },
                { clsName: 'decades', navFnc: 'y',  navStep: 100 }
            ],
            viewModes          = ['days', 'months', 'years', 'decades'],
            verticalModes      = ['top', 'bottom', 'auto'],
            horizontalModes    = ['left', 'right', 'auto'],
            toolbarPlacements  = ['default', 'top', 'bottom'],
            keyMap = {
                'up': 38, 38: 'up',
                'down': 40, 40: 'down',
                'left': 37, 37: 'left',
                'right': 39, 39: 'right',
                'tab': 9, 9: 'tab',
                'escape': 27, 27: 'escape',
                'enter': 13, 13: 'enter',
                'pageUp': 33, 33: 'pageUp',
                'pageDown': 34, 34: 'pageDown',
                'shift': 16, 16: 'shift',
                'control': 17, 17: 'control',
                'space': 32, 32: 'space',
                't': 84, 84: 't',
                'delete': 46, 46: 'delete'
            },
            keyState = {},

            // --------------------------------------------------
            // Private functions
            // --------------------------------------------------

            hasTimeZone = function () {
                // dayjs timezone 플러그인 기반
                return typeof dayjs.tz !== 'undefined' &&
                    options.timeZone !== undefined &&
                    options.timeZone !== null &&
                    options.timeZone !== '';
            },

            /**
             * [핵심 변환] getMoment → getDayjs
             * moment() 생성 패턴을 모두 dayjs()로 대체
             */
            getDayjs = function (d) {
                var result;

                if (d === undefined || d === null) {
                    result = dayjs();
                } else if (_isDayjs(d)) {
                    result = d.clone ? d.clone() : dayjs(d.toDate ? d.toDate() : d.$d);
                } else if (d instanceof Date) {
                    result = dayjs(d);
                } else if (typeof d === 'string') {
                    if (hasTimeZone()) {
                        // timezone 플러그인 필요
                        result = dayjs.tz(d, parseFormats && parseFormats[0] ? parseFormats[0] : undefined, options.timeZone);
                    } else {
                        // customParseFormat 플러그인으로 다중 포맷 파싱
                        result = _parseWithFormats(d, parseFormats, options.useStrict);
                    }
                } else {
                    result = dayjs(d);
                }

                if (hasTimeZone() && typeof result.tz === 'function') {
                    result = result.tz(options.timeZone);
                }

                return result;
            },

            /**
             * 다중 포맷으로 파싱 시도 (moment의 parseFormats 배열 지원 대체)
             * dayjs customParseFormat은 배열 포맷 미지원 → 순서대로 시도
             */
            _parseWithFormats = function (str, formats, strict) {
                if (!formats || formats.length === 0) {
                    return dayjs(str);
                }
                var result;
                for (var i = 0; i < formats.length; i++) {
                    result = dayjs(str, formats[i], strict || false);
                    if (result && result.isValid()) {
                        return result;
                    }
                }
                // 마지막 시도: 포맷 없이
                return dayjs(str);
            },

            isEnabled = function (granularity) {
                if (typeof granularity !== 'string' || granularity.length > 1) {
                    throw new TypeError('isEnabled expects a single character string parameter');
                }
                switch (granularity) {
                    case 'y': return actualFormat.indexOf('Y') !== -1;
                    case 'M': return actualFormat.indexOf('M') !== -1;
                    case 'd': return actualFormat.toLowerCase().indexOf('d') !== -1;
                    case 'h':
                    case 'H': return actualFormat.toLowerCase().indexOf('h') !== -1;
                    case 'm': return actualFormat.indexOf('m') !== -1;
                    case 's': return actualFormat.indexOf('s') !== -1;
                    default:  return false;
                }
            },

            hasTime = function () {
                return (isEnabled('h') || isEnabled('m') || isEnabled('s'));
            },

            hasDate = function () {
                return (isEnabled('y') || isEnabled('M') || isEnabled('d'));
            },

            getDatePickerTemplate = function () {
                var headTemplate = $('<thead>')
                        .append($('<tr>')
                            .append($('<th>').addClass('prev').attr('data-action', 'previous')
                                .append($('<span>').addClass(options.icons.previous)))
                            .append($('<th>').addClass('picker-switch').attr('data-action', 'pickerSwitch').attr('colspan', (options.calendarWeeks ? '6' : '5')))
                            .append($('<th>').addClass('next').attr('data-action', 'next')
                                .append($('<span>').addClass(options.icons.next)))
                            ),
                    contTemplate = $('<tbody>')
                        .append($('<tr>')
                            .append($('<td>').attr('colspan', (options.calendarWeeks ? '8' : '7')))
                            );

                return [
                    $('<div>').addClass('datepicker-days')
                        .append($('<table>').addClass('table-condensed')
                            .append(headTemplate)
                            .append($('<tbody>'))),
                    $('<div>').addClass('datepicker-months')
                        .append($('<table>').addClass('table-condensed')
                            .append(headTemplate.clone())
                            .append(contTemplate.clone())),
                    $('<div>').addClass('datepicker-years')
                        .append($('<table>').addClass('table-condensed')
                            .append(headTemplate.clone())
                            .append(contTemplate.clone())),
                    $('<div>').addClass('datepicker-decades')
                        .append($('<table>').addClass('table-condensed')
                            .append(headTemplate.clone())
                            .append(contTemplate.clone()))
                ];
            },

            getTimePickerMainTemplate = function () {
                var topRow    = $('<tr>'),
                    middleRow = $('<tr>'),
                    bottomRow = $('<tr>');

                if (isEnabled('h')) {
                    topRow.append($('<td>').append($('<a>').attr({ href: '#', tabindex: '-1', 'title': options.tooltips.incrementHour }).addClass('btn').attr('data-action', 'incrementHours').append($('<span>').addClass(options.icons.up))));
                    middleRow.append($('<td>').append($('<span>').addClass('timepicker-hour').attr({ 'data-time-component': 'hours', 'title': options.tooltips.pickHour }).attr('data-action', 'showHours')));
                    bottomRow.append($('<td>').append($('<a>').attr({ href: '#', tabindex: '-1', 'title': options.tooltips.decrementHour }).addClass('btn').attr('data-action', 'decrementHours').append($('<span>').addClass(options.icons.down))));
                }
                if (isEnabled('m')) {
                    if (isEnabled('h')) {
                        topRow.append($('<td>').addClass('separator'));
                        middleRow.append($('<td>').addClass('separator').html(':'));
                        bottomRow.append($('<td>').addClass('separator'));
                    }
                    topRow.append($('<td>').append($('<a>').attr({ href: '#', tabindex: '-1', 'title': options.tooltips.incrementMinute }).addClass('btn').attr('data-action', 'incrementMinutes').append($('<span>').addClass(options.icons.up))));
                    middleRow.append($('<td>').append($('<span>').addClass('timepicker-minute').attr({ 'data-time-component': 'minutes', 'title': options.tooltips.pickMinute }).attr('data-action', 'showMinutes')));
                    bottomRow.append($('<td>').append($('<a>').attr({ href: '#', tabindex: '-1', 'title': options.tooltips.decrementMinute }).addClass('btn').attr('data-action', 'decrementMinutes').append($('<span>').addClass(options.icons.down))));
                }
                if (isEnabled('s')) {
                    if (isEnabled('m')) {
                        topRow.append($('<td>').addClass('separator'));
                        middleRow.append($('<td>').addClass('separator').html(':'));
                        bottomRow.append($('<td>').addClass('separator'));
                    }
                    topRow.append($('<td>').append($('<a>').attr({ href: '#', tabindex: '-1', 'title': options.tooltips.incrementSecond }).addClass('btn').attr('data-action', 'incrementSeconds').append($('<span>').addClass(options.icons.up))));
                    middleRow.append($('<td>').append($('<span>').addClass('timepicker-second').attr({ 'data-time-component': 'seconds', 'title': options.tooltips.pickSecond }).attr('data-action', 'showSeconds')));
                    bottomRow.append($('<td>').append($('<a>').attr({ href: '#', tabindex: '-1', 'title': options.tooltips.decrementSecond }).addClass('btn').attr('data-action', 'decrementSeconds').append($('<span>').addClass(options.icons.down))));
                }

                if (!use24Hours) {
                    topRow.append($('<td>').addClass('separator'));
                    middleRow.append($('<td>').append($('<button>').addClass('btn btn-primary').attr({ 'data-action': 'togglePeriod', tabindex: '-1', 'title': options.tooltips.togglePeriod })));
                    bottomRow.append($('<td>').addClass('separator'));
                }

                return $('<div>').addClass('timepicker-picker')
                    .append($('<table>').addClass('table-condensed').append([topRow, middleRow, bottomRow]));
            },

            getTimePickerTemplate = function () {
                var hoursView   = $('<div>').addClass('timepicker-hours').append($('<table>').addClass('table-condensed')),
                    minutesView = $('<div>').addClass('timepicker-minutes').append($('<table>').addClass('table-condensed')),
                    secondsView = $('<div>').addClass('timepicker-seconds').append($('<table>').addClass('table-condensed')),
                    ret = [getTimePickerMainTemplate()];

                if (isEnabled('h')) { ret.push(hoursView); }
                if (isEnabled('m')) { ret.push(minutesView); }
                if (isEnabled('s')) { ret.push(secondsView); }
                return ret;
            },

            getToolbar = function () {
                var row = [];
                if (options.showTodayButton) {
                    row.push($('<td>').append($('<a>').attr({ 'data-action': 'today', 'title': options.tooltips.today }).append($('<span>').addClass(options.icons.today))));
                }
                if (!options.sideBySide && hasDate() && hasTime()) {
                    row.push($('<td>').append($('<a>').attr({ 'data-action': 'togglePicker', 'title': options.tooltips.selectTime }).append($('<span>').addClass(options.icons.time))));
                }
                if (options.showClear) {
                    row.push($('<td>').append($('<a>').attr({ 'data-action': 'clear', 'title': options.tooltips.clear }).append($('<span>').addClass(options.icons.clear))));
                }
                if (options.showClose) {
                    row.push($('<td>').append($('<a>').attr({ 'data-action': 'close', 'title': options.tooltips.close }).append($('<span>').addClass(options.icons.close))));
                }
                return $('<table>').addClass('table-condensed').append($('<tbody>').append($('<tr>').append(row)));
            },

            getTemplate = function () {
                var template = $('<div>').addClass('bootstrap-datetimepicker-widget dropdown-menu'),
                    dateView = $('<div>').addClass('datepicker').append(getDatePickerTemplate()),
                    timeView = $('<div>').addClass('timepicker').append(getTimePickerTemplate()),
                    content  = $('<ul>').addClass('list-unstyled'),
                    toolbar  = $('<li>').addClass('picker-switch' + (options.collapse ? ' accordion-toggle' : '')).append(getToolbar());

                if (options.inline) { template.removeClass('dropdown-menu'); }
                if (use24Hours)     { template.addClass('usetwentyfour'); }
                if (isEnabled('s') && !use24Hours) { template.addClass('wider'); }

                if (options.sideBySide && hasDate() && hasTime()) {
                    template.addClass('timepicker-sbs');
                    if (options.toolbarPlacement === 'top')    { template.append(toolbar); }
                    template.append($('<div>').addClass('row').append(dateView.addClass('col-md-6')).append(timeView.addClass('col-md-6')));
                    if (options.toolbarPlacement === 'bottom') { template.append(toolbar); }
                    return template;
                }

                if (options.toolbarPlacement === 'top')     { content.append(toolbar); }
                if (hasDate())  { content.append($('<li>').addClass((options.collapse && hasTime() ? 'collapse in' : '')).append(dateView)); }
                if (options.toolbarPlacement === 'default') { content.append(toolbar); }
                if (hasTime())  { content.append($('<li>').addClass((options.collapse && hasDate() ? 'collapse' : '')).append(timeView)); }
                if (options.toolbarPlacement === 'bottom')  { content.append(toolbar); }
                return template.append(content);
            },

            dataToOptions = function () {
                var eData, dataOptions = {};
                if (element.is('input') || options.inline) {
                    eData = element.data();
                } else {
                    eData = element.find('input').data();
                }
                if (eData.dateOptions && eData.dateOptions instanceof Object) {
                    dataOptions = $.extend(true, dataOptions, eData.dateOptions);
                }
                $.each(options, function (key) {
                    var attributeName = 'date' + key.charAt(0).toUpperCase() + key.slice(1);
                    if (eData[attributeName] !== undefined) {
                        dataOptions[key] = eData[attributeName];
                    }
                });
                return dataOptions;
            },

            place = function () {
                var position   = (component || element).position(),
                    offset     = (component || element).offset(),
                    vertical   = options.widgetPositioning.vertical,
                    horizontal = options.widgetPositioning.horizontal,
                    parent;

                if (options.widgetParent) {
                    parent = options.widgetParent.append(widget);
                } else if (element.is('input')) {
                    parent = element.after(widget).parent();
                } else if (options.inline) {
                    parent = element.append(widget);
                    return;
                } else {
                    parent = element;
                    element.children().first().after(widget);
                }

                if (vertical === 'auto') {
                    if (offset.top + widget.height() * 1.5 >= $(window).height() + $(window).scrollTop() &&
                        widget.height() + element.outerHeight() < offset.top) {
                        vertical = 'top';
                    } else {
                        vertical = 'bottom';
                    }
                }
                if (horizontal === 'auto') {
                    if (parent.width() < offset.left + widget.outerWidth() / 2 &&
                        offset.left + widget.outerWidth() > $(window).width()) {
                        horizontal = 'right';
                    } else {
                        horizontal = 'left';
                    }
                }

                if (vertical === 'top') {
                    widget.addClass('top').removeClass('bottom');
                } else {
                    widget.addClass('bottom').removeClass('top');
                }
                if (horizontal === 'right') {
                    widget.addClass('pull-right');
                } else {
                    widget.removeClass('pull-right');
                }

                if (parent.css('position') === 'static') {
                    parent = parent.parents().filter(function () {
                        return $(this).css('position') !== 'static';
                    }).first();
                }
                if (parent.length === 0) {
                    throw new Error('datetimepicker component should be placed within a non-static positioned container');
                }

                widget.css({
                    top:    vertical === 'top' ? 'auto' : position.top + element.outerHeight(),
                    bottom: vertical === 'top' ? parent.outerHeight() - (parent === element ? 0 : position.top) : 'auto',
                    left:   horizontal === 'left' ? (parent === element ? 0 : position.left) : 'auto',
                    right:  horizontal === 'left' ? 'auto' : parent.outerWidth() - element.outerWidth() - (parent === element ? 0 : position.left)
                });
            },

            notifyEvent = function (e) {
                if (e.type === 'dp.change' && ((e.date && e.date.isSame(e.oldDate)) || (!e.date && !e.oldDate))) {
                    return;
                }
                element.trigger(e);
            },

            viewUpdate = function (e) {
                if (e === 'y') { e = 'YYYY'; }
                notifyEvent({
                    type: 'dp.update',
                    change: e,
                    viewDate: viewDate.clone()
                });
            },

            showMode = function (dir) {
                if (!widget) { return; }
                if (dir) {
                    currentViewMode = Math.max(minViewModeNumber, Math.min(3, currentViewMode + dir));
                }
                widget.find('.datepicker > div').hide().filter('.datepicker-' + datePickerModes[currentViewMode].clsName).show();
            },

            fillDow = function () {
                var row         = $('<tr>'),
                    // [dayjs 변환] viewDate.clone().startOf('w').startOf('d')
                    // Day.js: startOf('week') 로 처리
                    currentDate = _startOfWeek(viewDate.clone()).startOf('day');

                if (options.calendarWeeks === true) {
                    row.append($('<th>').addClass('cw').text('#'));
                }
                // [dayjs 변환] isBefore(endOf('week')) 로 순회
                while (currentDate.isBefore(_endOfWeek(viewDate.clone()))) {
                    // [dayjs 변환] .format('dd') → _formatDd()
                    row.append($('<th>').addClass('dow').text(_formatDd(currentDate)));
                    currentDate = currentDate.add(1, 'day');
                }
                widget.find('.datepicker-days thead').append(row);
            },

            isInDisabledDates = function (testDate) {
                return options.disabledDates[testDate.format('YYYY-MM-DD')] === true;
            },

            isInEnabledDates = function (testDate) {
                return options.enabledDates[testDate.format('YYYY-MM-DD')] === true;
            },

            isInDisabledHours = function (testDate) {
                return options.disabledHours[testDate.format('H')] === true;
            },

            isInEnabledHours = function (testDate) {
                return options.enabledHours[testDate.format('H')] === true;
            },

            isValid = function (targetDayjs, granularity) {
                if (!targetDayjs.isValid()) { return false; }

                // [dayjs 변환] granularity 단위 매핑
                // moment의 'M' → dayjs의 'month', 'd' → 'day', 'y' → 'year'
                var gran = _normalizeGranularity(granularity);

                if (options.disabledDates && granularity === 'd' && isInDisabledDates(targetDayjs)) { return false; }
                if (options.enabledDates && granularity === 'd' && !isInEnabledDates(targetDayjs)) { return false; }

                // [dayjs 변환] isBefore/isAfter: dayjs는 두 번째 인자로 단위 지원
                if (options.minDate && targetDayjs.isBefore(options.minDate, gran)) { return false; }
                if (options.maxDate && targetDayjs.isAfter(options.maxDate, gran)) { return false; }

                if (options.daysOfWeekDisabled && granularity === 'd' &&
                    options.daysOfWeekDisabled.indexOf(_weekday(targetDayjs)) !== -1) { return false; }

                if (options.disabledHours && (granularity === 'h' || granularity === 'm' || granularity === 's') && isInDisabledHours(targetDayjs)) { return false; }
                if (options.enabledHours && (granularity === 'h' || granularity === 'm' || granularity === 's') && !isInEnabledHours(targetDayjs)) { return false; }

                if (options.disabledTimeIntervals && (granularity === 'h' || granularity === 'm' || granularity === 's')) {
                    var found = false;
                    $.each(options.disabledTimeIntervals, function () {
                        if (_isBetween(targetDayjs, this[0], this[1])) {
                            found = true;
                            return false;
                        }
                    });
                    if (found) { return false; }
                }
                return true;
            },

            /**
             * moment granularity 문자 → dayjs 단위 문자열 변환
             * moment: 'M','d','y','h','m','s'
             * dayjs:  'month','day','year','hour','minute','second'
             */
            _normalizeGranularity = function (g) {
                var map = { 'M': 'month', 'd': 'day', 'y': 'year', 'h': 'hour', 'm': 'minute', 's': 'second' };
                return map[g] || g;
            },

            fillMonths = function () {
                var spans       = [],
                    // [dayjs 변환] viewDate.clone().startOf('y').startOf('d')
                    monthsShort = viewDate.clone().startOf('year').startOf('day');

                while (monthsShort.isSame(viewDate, 'year')) {
                    // [dayjs 변환] .format('MMM') 동일
                    spans.push($('<span>').attr('data-action', 'selectMonth').addClass('month').text(monthsShort.format('MMM')));
                    monthsShort = monthsShort.add(1, 'month');
                }
                widget.find('.datepicker-months td').empty().append(spans);
            },

            updateMonths = function () {
                var monthsView       = widget.find('.datepicker-months'),
                    monthsViewHeader = monthsView.find('th'),
                    months           = monthsView.find('tbody').find('span');

                monthsViewHeader.eq(0).find('span').attr('title', options.tooltips.prevYear);
                monthsViewHeader.eq(1).attr('title', options.tooltips.selectYear);
                monthsViewHeader.eq(2).find('span').attr('title', options.tooltips.nextYear);

                monthsView.find('.disabled').removeClass('disabled');

                if (!isValid(viewDate.clone().subtract(1, 'year'), 'y')) {
                    monthsViewHeader.eq(0).addClass('disabled');
                }
                // [dayjs 변환] .year() 동일
                monthsViewHeader.eq(1).text(viewDate.year());

                if (!isValid(viewDate.clone().add(1, 'year'), 'y')) {
                    monthsViewHeader.eq(2).addClass('disabled');
                }

                months.removeClass('active');
                // [dayjs 변환] .isSame(viewDate, 'y') → 'year'
                if (date.isSame(viewDate, 'year') && !unset) {
                    // [dayjs 변환] .month() 동일 (0-indexed)
                    months.eq(date.month()).addClass('active');
                }
                months.each(function (index) {
                    if (!isValid(viewDate.clone().month(index), 'M')) {
                        $(this).addClass('disabled');
                    }
                });
            },

            updateYears = function () {
                var yearsView       = widget.find('.datepicker-years'),
                    yearsViewHeader = yearsView.find('th'),
                    startYear       = viewDate.clone().subtract(5, 'year'),
                    endYear         = viewDate.clone().add(6, 'year'),
                    html            = '';

                yearsViewHeader.eq(0).find('span').attr('title', options.tooltips.prevDecade);
                yearsViewHeader.eq(1).attr('title', options.tooltips.selectDecade);
                yearsViewHeader.eq(2).find('span').attr('title', options.tooltips.nextDecade);

                yearsView.find('.disabled').removeClass('disabled');

                if (options.minDate && options.minDate.isAfter(startYear, 'year')) {
                    yearsViewHeader.eq(0).addClass('disabled');
                }
                yearsViewHeader.eq(1).text(startYear.year() + '-' + endYear.year());

                if (options.maxDate && options.maxDate.isBefore(endYear, 'year')) {
                    yearsViewHeader.eq(2).addClass('disabled');
                }

                while (!startYear.isAfter(endYear, 'year')) {
                    html += '<span data-action="selectYear" class="year' +
                        (startYear.isSame(date, 'year') && !unset ? ' active' : '') +
                        (!isValid(startYear, 'y') ? ' disabled' : '') + '">' +
                        startYear.year() + '</span>';
                    startYear = startYear.add(1, 'year');
                }
                yearsView.find('td').html(html);
            },

            updateDecades = function () {
                var decadesView       = widget.find('.datepicker-decades'),
                    decadesViewHeader = decadesView.find('th'),
                    // [dayjs 변환] moment({ y: X }) → _dayjsFromObject({ y: X })
                    startDecade       = _dayjsFromObject({ y: viewDate.year() - (viewDate.year() % 100) - 1 }),
                    endDecade         = startDecade.clone ? startDecade.clone().add(100, 'year') : startDecade.add(100, 'year'),
                    startedAt         = startDecade,
                    minDateDecade     = false,
                    maxDateDecade     = false,
                    endDecadeYear,
                    html              = '';

                // dayjs는 immutable이라 clone() 필요 없지만 명시적으로 처리
                endDecade   = startDecade.add(100, 'year');
                startedAt   = startDecade;

                decadesViewHeader.eq(0).find('span').attr('title', options.tooltips.prevCentury);
                decadesViewHeader.eq(2).find('span').attr('title', options.tooltips.nextCentury);
                decadesView.find('.disabled').removeClass('disabled');

                // [dayjs 변환] moment({ y: 1900 }) → _dayjsFromObject({ y: 1900 })
                if (startDecade.isSame(_dayjsFromObject({ y: 1900 }), 'year') ||
                    (options.minDate && options.minDate.isAfter(startDecade, 'year'))) {
                    decadesViewHeader.eq(0).addClass('disabled');
                }

                decadesViewHeader.eq(1).text(startDecade.year() + '-' + endDecade.year());

                if (startDecade.isSame(_dayjsFromObject({ y: 2000 }), 'year') ||
                    (options.maxDate && options.maxDate.isBefore(endDecade, 'year'))) {
                    decadesViewHeader.eq(2).addClass('disabled');
                }

                while (!startDecade.isAfter(endDecade, 'year')) {
                    endDecadeYear = startDecade.year() + 12;
                    minDateDecade = options.minDate && options.minDate.isAfter(startDecade, 'year') && options.minDate.year() <= endDecadeYear;
                    maxDateDecade = options.maxDate && options.maxDate.isAfter(startDecade, 'year') && options.maxDate.year() <= endDecadeYear;
                    html += '<span data-action="selectDecade" class="decade' +
                        (date.isAfter(startDecade) && date.year() <= endDecadeYear ? ' active' : '') +
                        (!isValid(startDecade, 'y') && !minDateDecade && !maxDateDecade ? ' disabled' : '') +
                        '" data-selection="' + (startDecade.year() + 6) + '">' +
                        (startDecade.year() + 1) + ' - ' + (startDecade.year() + 12) + '</span>';
                    startDecade = startDecade.add(12, 'year');
                }
                html += '<span></span><span></span><span></span>';
                decadesView.find('td').html(html);
                decadesViewHeader.eq(1).text((startedAt.year() + 1) + '-' + (startDecade.year()));
            },

            fillDate = function () {
                var daysView       = widget.find('.datepicker-days'),
                    daysViewHeader = daysView.find('th'),
                    currentDate,
                    html   = [],
                    row,
                    clsNames = [],
                    i;

                if (!hasDate()) { return; }

                daysViewHeader.eq(0).find('span').attr('title', options.tooltips.prevMonth);
                daysViewHeader.eq(1).attr('title', options.tooltips.selectMonth);
                daysViewHeader.eq(2).find('span').attr('title', options.tooltips.nextMonth);

                daysView.find('.disabled').removeClass('disabled');
                daysViewHeader.eq(1).text(viewDate.format(options.dayViewHeaderFormat));

                if (!isValid(viewDate.clone().subtract(1, 'month'), 'M')) {
                    daysViewHeader.eq(0).addClass('disabled');
                }
                if (!isValid(viewDate.clone().add(1, 'month'), 'M')) {
                    daysViewHeader.eq(2).addClass('disabled');
                }

                // [dayjs 변환] startOf('M') → startOf('month'), startOf('w') → startOf('week')
                currentDate = _startOfWeek(viewDate.clone().startOf('month')).startOf('day');

                for (i = 0; i < 42; i++) {
                    // [dayjs 변환] .weekday() → .day() (0=Sun)
                    if (_weekday(currentDate) === 0) {
                        row = $('<tr>');
                        if (options.calendarWeeks) {
                            // [dayjs 변환] .week() → _week()
                            row.append('<td class="cw">' + _week(currentDate) + '</td>');
                        }
                        html.push(row);
                    }
                    clsNames = ['day'];
                    if (currentDate.isBefore(viewDate, 'month'))  { clsNames.push('old'); }
                    if (currentDate.isAfter(viewDate, 'month'))   { clsNames.push('new'); }
                    if (currentDate.isSame(date, 'day') && !unset){ clsNames.push('active'); }
                    if (!isValid(currentDate, 'd'))                { clsNames.push('disabled'); }
                    // [dayjs 변환] getDayjs() → 현재 시각 dayjs
                    if (currentDate.isSame(getDayjs(), 'day'))     { clsNames.push('today'); }
                    // [dayjs 변환] .day() 동일 (0=Sun, 6=Sat)
                    if (currentDate.day() === 0 || currentDate.day() === 6) { clsNames.push('weekend'); }

                    notifyEvent({
                        type: 'dp.classify',
                        date: currentDate,
                        classNames: clsNames
                    });
                    // [dayjs 변환] .format('L') → locale 기반 short date
                    row.append('<td data-action="selectDay" data-day="' + currentDate.format('MM/DD/YYYY') + '" class="' + clsNames.join(' ') + '">' + currentDate.date() + '</td>');
                    currentDate = currentDate.add(1, 'day');
                }

                daysView.find('tbody').empty().append(html);
                updateMonths();
                updateYears();
                updateDecades();
            },

            fillHours = function () {
                var table       = widget.find('.timepicker-hours table'),
                    // [dayjs 변환] startOf('d') → startOf('day')
                    currentHour = viewDate.clone().startOf('day'),
                    html        = [],
                    row         = $('<tr>');

                if (viewDate.hour() > 11 && !use24Hours) {
                    currentHour = currentHour.hour(12);
                }
                while (currentHour.isSame(viewDate, 'day') &&
                       (use24Hours || (viewDate.hour() < 12 && currentHour.hour() < 12) || viewDate.hour() > 11)) {
                    if (currentHour.hour() % 4 === 0) {
                        row = $('<tr>');
                        html.push(row);
                    }
                    row.append('<td data-action="selectHour" class="hour' +
                        (!isValid(currentHour, 'h') ? ' disabled' : '') + '">' +
                        currentHour.format(use24Hours ? 'HH' : 'hh') + '</td>');
                    currentHour = currentHour.add(1, 'hour');
                }
                table.empty().append(html);
            },

            fillMinutes = function () {
                var table         = widget.find('.timepicker-minutes table'),
                    // [dayjs 변환] startOf('h') → startOf('hour')
                    currentMinute = viewDate.clone().startOf('hour'),
                    html          = [],
                    row           = $('<tr>'),
                    step          = options.stepping === 1 ? 5 : options.stepping;

                while (viewDate.isSame(currentMinute, 'hour')) {
                    if (currentMinute.minute() % (step * 4) === 0) {
                        row = $('<tr>');
                        html.push(row);
                    }
                    row.append('<td data-action="selectMinute" class="minute' +
                        (!isValid(currentMinute, 'm') ? ' disabled' : '') + '">' +
                        currentMinute.format('mm') + '</td>');
                    currentMinute = currentMinute.add(step, 'minute');
                }
                table.empty().append(html);
            },

            fillSeconds = function () {
                var table         = widget.find('.timepicker-seconds table'),
                    // [dayjs 변환] startOf('m') → startOf('minute')
                    currentSecond = viewDate.clone().startOf('minute'),
                    html          = [],
                    row           = $('<tr>');

                while (viewDate.isSame(currentSecond, 'minute')) {
                    if (currentSecond.second() % 20 === 0) {
                        row = $('<tr>');
                        html.push(row);
                    }
                    row.append('<td data-action="selectSecond" class="second' +
                        (!isValid(currentSecond, 's') ? ' disabled' : '') + '">' +
                        currentSecond.format('ss') + '</td>');
                    currentSecond = currentSecond.add(5, 'second');
                }
                table.empty().append(html);
            },

            fillTime = function () {
                var toggle, newDate,
                    timeComponents = widget.find('.timepicker span[data-time-component]');

                if (!use24Hours) {
                    toggle  = widget.find('.timepicker [data-action=togglePeriod]');
                    newDate = date.add((date.hour() >= 12) ? -12 : 12, 'hour');
                    // [dayjs 변환] .format('A') 동일
                    toggle.text(date.format('A'));
                    if (isValid(newDate, 'h')) {
                        toggle.removeClass('disabled');
                    } else {
                        toggle.addClass('disabled');
                    }
                }
                timeComponents.filter('[data-time-component=hours]').text(date.format(use24Hours ? 'HH' : 'hh'));
                timeComponents.filter('[data-time-component=minutes]').text(date.format('mm'));
                timeComponents.filter('[data-time-component=seconds]').text(date.format('ss'));

                fillHours();
                fillMinutes();
                fillSeconds();
            },

            update = function () {
                if (!widget) { return; }
                fillDate();
                fillTime();
            },

            setValue = function (targetDayjs) {
                var oldDate = unset ? null : date;

                if (!targetDayjs) {
                    unset = true;
                    input.val('');
                    element.data('date', '');
                    notifyEvent({ type: 'dp.change', date: false, oldDate: oldDate });
                    update();
                    return;
                }

                // [dayjs 변환] .clone().locale() → dayjs는 immutable, locale 적용
                targetDayjs = _applyLocale(targetDayjs, options.locale);

                if (hasTimeZone() && typeof targetDayjs.tz === 'function') {
                    targetDayjs = targetDayjs.tz(options.timeZone);
                }

                if (options.stepping !== 1) {
                    // [dayjs 변환] minutes/seconds 설정
                    targetDayjs = targetDayjs
                        .minute(Math.round(targetDayjs.minute() / options.stepping) * options.stepping)
                        .second(0);

                    while (options.minDate && targetDayjs.isBefore(options.minDate)) {
                        targetDayjs = targetDayjs.add(options.stepping, 'minute');
                    }
                }

                if (isValid(targetDayjs)) {
                    date     = targetDayjs;
                    viewDate = date;
                    input.val(date.format(actualFormat));
                    element.data('date', date.format(actualFormat));
                    unset = false;
                    update();
                    notifyEvent({ type: 'dp.change', date: date, oldDate: oldDate });
                } else {
                    if (!options.keepInvalid) {
                        input.val(unset ? '' : date.format(actualFormat));
                    } else {
                        notifyEvent({ type: 'dp.change', date: targetDayjs, oldDate: oldDate });
                    }
                    notifyEvent({ type: 'dp.error', date: targetDayjs, oldDate: oldDate });
                }
            },

            hide = function () {
                var transitioning = false;
                if (!widget) { return picker; }
                widget.find('.collapse').each(function () {
                    var collapseData = $(this).data('collapse');
                    if (collapseData && collapseData.transitioning) {
                        transitioning = true;
                        return false;
                    }
                    return true;
                });
                if (transitioning) { return picker; }
                if (component && component.hasClass('btn')) {
                    component.toggleClass('active');
                }
                widget.hide();
                $(window).off('resize', place);
                widget.off('click', '[data-action]');
                widget.off('mousedown', false);
                widget.remove();
                widget = false;

                notifyEvent({ type: 'dp.hide', date: date });
                input.blur();
                viewDate = date;
                return picker;
            },

            clear = function () {
                setValue(null);
            },

            parseInputDate = function (inputDate) {
                if (options.parseInputDate === undefined) {
                    if (!_isDayjs(inputDate) || inputDate instanceof Date) {
                        inputDate = getDayjs(inputDate);
                    }
                } else {
                    inputDate = options.parseInputDate(inputDate);
                }
                return inputDate;
            },

            // --------------------------------------------------
            // Widget UI interaction functions
            // --------------------------------------------------
            actions = {
                next: function () {
                    var navFnc = datePickerModes[currentViewMode].navFnc;
                    viewDate = viewDate.add(datePickerModes[currentViewMode].navStep, navFnc === 'M' ? 'month' : 'year');
                    fillDate();
                    viewUpdate(navFnc);
                },

                previous: function () {
                    var navFnc = datePickerModes[currentViewMode].navFnc;
                    viewDate = viewDate.subtract(datePickerModes[currentViewMode].navStep, navFnc === 'M' ? 'month' : 'year');
                    fillDate();
                    viewUpdate(navFnc);
                },

                pickerSwitch: function () {
                    showMode(1);
                },

                selectMonth: function (e) {
                    var month = $(e.target).closest('tbody').find('span').index($(e.target));
                    viewDate = viewDate.month(month);
                    if (currentViewMode === minViewModeNumber) {
                        setValue(date.year(viewDate.year()).month(viewDate.month()));
                        if (!options.inline) { hide(); }
                    } else {
                        showMode(-1);
                        fillDate();
                    }
                    viewUpdate('M');
                },

                selectYear: function (e) {
                    var year = parseInt($(e.target).text(), 10) || 0;
                    viewDate = viewDate.year(year);
                    if (currentViewMode === minViewModeNumber) {
                        setValue(date.year(viewDate.year()));
                        if (!options.inline) { hide(); }
                    } else {
                        showMode(-1);
                        fillDate();
                    }
                    viewUpdate('YYYY');
                },

                selectDecade: function (e) {
                    var year = parseInt($(e.target).data('selection'), 10) || 0;
                    viewDate = viewDate.year(year);
                    if (currentViewMode === minViewModeNumber) {
                        setValue(date.year(viewDate.year()));
                        if (!options.inline) { hide(); }
                    } else {
                        showMode(-1);
                        fillDate();
                    }
                    viewUpdate('YYYY');
                },

                selectDay: function (e) {
                    var day = viewDate;
                    if ($(e.target).is('.old')) { day = day.subtract(1, 'month'); }
                    if ($(e.target).is('.new')) { day = day.add(1, 'month'); }
                    setValue(day.date(parseInt($(e.target).text(), 10)));
                    if (!hasTime() && !options.keepOpen && !options.inline) {
                        hide();
                    }
                },

                incrementHours: function () {
                    var newDate = date.add(1, 'hour');
                    if (isValid(newDate, 'h')) { setValue(newDate); }
                },

                incrementMinutes: function () {
                    var newDate = date.add(options.stepping, 'minute');
                    if (isValid(newDate, 'm')) { setValue(newDate); }
                },

                incrementSeconds: function () {
                    var newDate = date.add(1, 'second');
                    if (isValid(newDate, 's')) { setValue(newDate); }
                },

                decrementHours: function () {
                    var newDate = date.subtract(1, 'hour');
                    if (isValid(newDate, 'h')) { setValue(newDate); }
                },

                decrementMinutes: function () {
                    var newDate = date.subtract(options.stepping, 'minute');
                    if (isValid(newDate, 'm')) { setValue(newDate); }
                },

                decrementSeconds: function () {
                    var newDate = date.subtract(1, 'second');
                    if (isValid(newDate, 's')) { setValue(newDate); }
                },

                togglePeriod: function () {
                    setValue(date.add((date.hour() >= 12) ? -12 : 12, 'hour'));
                },

                togglePicker: function (e) {
                    var $this      = $(e.target),
                        $parent    = $this.closest('ul'),
                        expanded   = $parent.find('.in'),
                        closed     = $parent.find('.collapse:not(.in)'),
                        collapseData;

                    if (expanded && expanded.length) {
                        collapseData = expanded.data('collapse');
                        if (collapseData && collapseData.transitioning) { return; }
                        if (expanded.collapse) {
                            expanded.collapse('hide');
                            closed.collapse('show');
                        } else {
                            expanded.removeClass('in');
                            closed.addClass('in');
                        }
                        if ($this.is('span')) {
                            $this.toggleClass(options.icons.time + ' ' + options.icons.date);
                        } else {
                            $this.find('span').toggleClass(options.icons.time + ' ' + options.icons.date);
                        }
                    }
                },

                showPicker:  function () { widget.find('.timepicker > div:not(.timepicker-picker)').hide(); widget.find('.timepicker .timepicker-picker').show(); },
                showHours:   function () { widget.find('.timepicker .timepicker-picker').hide(); widget.find('.timepicker .timepicker-hours').show(); },
                showMinutes: function () { widget.find('.timepicker .timepicker-picker').hide(); widget.find('.timepicker .timepicker-minutes').show(); },
                showSeconds: function () { widget.find('.timepicker .timepicker-picker').hide(); widget.find('.timepicker .timepicker-seconds').show(); },

                selectHour: function (e) {
                    var hour = parseInt($(e.target).text(), 10);
                    if (!use24Hours) {
                        if (date.hour() >= 12) {
                            if (hour !== 12) { hour += 12; }
                        } else {
                            if (hour === 12) { hour = 0; }
                        }
                    }
                    setValue(date.hour(hour));
                    actions.showPicker.call(picker);
                },

                selectMinute: function (e) {
                    setValue(date.minute(parseInt($(e.target).text(), 10)));
                    actions.showPicker.call(picker);
                },

                selectSecond: function (e) {
                    setValue(date.second(parseInt($(e.target).text(), 10)));
                    actions.showPicker.call(picker);
                },

                clear: clear,

                today: function () {
                    var todaysDate = getDayjs();
                    if (isValid(todaysDate, 'd')) { setValue(todaysDate); }
                },

                close: hide
            },

            doAction = function (e) {
                if ($(e.currentTarget).is('.disabled')) { return false; }
                actions[$(e.currentTarget).data('action')].apply(picker, arguments);
                return false;
            },

            show = function () {
                var currentDayjs,
                    useCurrentGranularity = {
                        'year':   function (m) { return m.month(0).date(1).hour(0).second(0).minute(0); },
                        'month':  function (m) { return m.date(1).hour(0).second(0).minute(0); },
                        'day':    function (m) { return m.hour(0).second(0).minute(0); },
                        'hour':   function (m) { return m.second(0).minute(0); },
                        'minute': function (m) { return m.second(0); }
                    };

                if (input.prop('disabled') || (!options.ignoreReadonly && input.prop('readonly')) || widget) {
                    return picker;
                }
                if (input.val() !== undefined && input.val().trim().length !== 0) {
                    setValue(parseInputDate(input.val().trim()));
                } else if (unset && options.useCurrent && (options.inline || (input.is('input') && input.val().trim().length === 0))) {
                    currentDayjs = getDayjs();
                    if (typeof options.useCurrent === 'string') {
                        currentDayjs = useCurrentGranularity[options.useCurrent](currentDayjs);
                    }
                    setValue(currentDayjs);
                }

                widget = getTemplate();
                fillDow();
                fillMonths();

                widget.find('.timepicker-hours').hide();
                widget.find('.timepicker-minutes').hide();
                widget.find('.timepicker-seconds').hide();

                update();
                showMode();

                $(window).on('resize', place);
                widget.on('click', '[data-action]', doAction);
                widget.on('mousedown', false);

                if (component && component.hasClass('btn')) {
                    component.toggleClass('active');
                }
                place();
                widget.show();
                if (options.focusOnShow && !input.is(':focus')) {
                    input.focus();
                }
                notifyEvent({ type: 'dp.show' });
                return picker;
            },

            toggle = function () {
                return (widget ? hide() : show());
            },

            keydown = function (e) {
                var handler = null,
                    index, index2,
                    pressedKeys     = [],
                    pressedModifiers = {},
                    currentKey      = e.which,
                    keyBindKeys,
                    allModifiersPressed,
                    pressed = 'p';

                keyState[currentKey] = pressed;

                for (index in keyState) {
                    if (keyState.hasOwnProperty(index) && keyState[index] === pressed) {
                        pressedKeys.push(index);
                        if (parseInt(index, 10) !== currentKey) {
                            pressedModifiers[index] = true;
                        }
                    }
                }

                for (index in options.keyBinds) {
                    if (options.keyBinds.hasOwnProperty(index) && typeof (options.keyBinds[index]) === 'function') {
                        keyBindKeys = index.split(' ');
                        if (keyBindKeys.length === pressedKeys.length && keyMap[currentKey] === keyBindKeys[keyBindKeys.length - 1]) {
                            allModifiersPressed = true;
                            for (index2 = keyBindKeys.length - 2; index2 >= 0; index2--) {
                                if (!(keyMap[keyBindKeys[index2]] in pressedModifiers)) {
                                    allModifiersPressed = false;
                                    break;
                                }
                            }
                            if (allModifiersPressed) {
                                handler = options.keyBinds[index];
                                break;
                            }
                        }
                    }
                }

                if (handler) {
                    handler.call(picker, widget);
                    e.stopPropagation();
                    e.preventDefault();
                }
            },

            keyup = function (e) {
                keyState[e.which] = 'r';
                e.stopPropagation();
                e.preventDefault();
            },

            change = function (e) {
                var val = $(e.target).val().trim(),
                    parsedDate = val ? parseInputDate(val) : null;
                setValue(parsedDate);
                e.stopImmediatePropagation();
                return false;
            },

            attachDatePickerElementEvents = function () {
                input.on({
                    'change':  change,
                    'blur':    options.debug ? '' : hide,
                    'keydown': keydown,
                    'keyup':   keyup,
                    'focus':   options.allowInputToggle ? show : ''
                });
                if (element.is('input')) {
                    input.on({ 'focus': show });
                } else if (component) {
                    component.on('click', toggle);
                    component.on('mousedown', false);
                }
            },

            detachDatePickerElementEvents = function () {
                input.off({
                    'change':  change,
                    'blur':    hide,
                    'keydown': keydown,
                    'keyup':   keyup,
                    'focus':   options.allowInputToggle ? hide : ''
                });
                if (element.is('input')) {
                    input.off({ 'focus': show });
                } else if (component) {
                    component.off('click', toggle);
                    component.off('mousedown', false);
                }
            },

            indexGivenDates = function (givenDatesArray) {
                var givenDatesIndexed = {};
                $.each(givenDatesArray, function () {
                    var dDate = parseInputDate(this);
                    if (dDate.isValid()) {
                        givenDatesIndexed[dDate.format('YYYY-MM-DD')] = true;
                    }
                });
                return (Object.keys(givenDatesIndexed).length) ? givenDatesIndexed : false;
            },

            indexGivenHours = function (givenHoursArray) {
                var givenHoursIndexed = {};
                $.each(givenHoursArray, function () {
                    givenHoursIndexed[this] = true;
                });
                return (Object.keys(givenHoursIndexed).length) ? givenHoursIndexed : false;
            },

            initFormatting = function () {
                var format = options.format || 'L LT';

                // [dayjs 변환] moment의 longDateFormat 중첩 치환 → _resolveFormat() 폴리필
                actualFormat = _resolveFormat(format);

                parseFormats = options.extraFormats ? options.extraFormats.slice() : [];
                if (parseFormats.indexOf(format) < 0 && parseFormats.indexOf(actualFormat) < 0) {
                    parseFormats.push(actualFormat);
                }

                // [dayjs 변환] 24시간제 판별: 'a'/'h' 없으면 24시간
                use24Hours = (actualFormat.toLowerCase().indexOf('a') < 1 &&
                              actualFormat.replace(/\[.*?\]/g, '').indexOf('h') < 1);

                if (isEnabled('y')) { minViewModeNumber = 2; }
                if (isEnabled('M')) { minViewModeNumber = 1; }
                if (isEnabled('d')) { minViewModeNumber = 0; }

                currentViewMode = Math.max(minViewModeNumber, currentViewMode);

                if (!unset) { setValue(date); }
            };

        // ======================================================
        // Public API
        // ======================================================

        picker.destroy = function () {
            hide();
            detachDatePickerElementEvents();
            element.removeData('DateTimePicker');
            element.removeData('date');
        };

        picker.toggle = toggle;
        picker.show   = show;
        picker.hide   = hide;

        picker.disable = function () {
            hide();
            if (component && component.hasClass('btn')) { component.addClass('disabled'); }
            input.prop('disabled', true);
            return picker;
        };

        picker.enable = function () {
            if (component && component.hasClass('btn')) { component.removeClass('disabled'); }
            input.prop('disabled', false);
            return picker;
        };

        picker.ignoreReadonly = function (ignoreReadonly) {
            if (arguments.length === 0) { return options.ignoreReadonly; }
            if (typeof ignoreReadonly !== 'boolean') { throw new TypeError('ignoreReadonly () expects a boolean parameter'); }
            options.ignoreReadonly = ignoreReadonly;
            return picker;
        };

        picker.options = function (newOptions) {
            if (arguments.length === 0) { return $.extend(true, {}, options); }
            if (!(newOptions instanceof Object)) { throw new TypeError('options() options parameter should be an object'); }
            $.extend(true, options, newOptions);
            $.each(options, function (key, value) {
                if (picker[key] !== undefined) {
                    picker[key](value);
                } else {
                    throw new TypeError('option ' + key + ' is not recognized!');
                }
            });
            return picker;
        };

        picker.date = function (newDate) {
            if (arguments.length === 0) {
                if (unset) { return null; }
                return date;
            }
            // [dayjs 변환] null | string | dayjs | Date 허용
            if (newDate !== null && typeof newDate !== 'string' && !_isDayjs(newDate) && !(newDate instanceof Date)) {
                throw new TypeError('date() parameter must be one of [null, string, dayjs or Date]');
            }
            setValue(newDate === null ? null : parseInputDate(newDate));
            return picker;
        };

        picker.format = function (newFormat) {
            if (arguments.length === 0) { return options.format; }
            if ((typeof newFormat !== 'string') && ((typeof newFormat !== 'boolean') || (newFormat !== false))) {
                throw new TypeError('format() expects a string or boolean:false parameter ' + newFormat);
            }
            options.format = newFormat;
            if (actualFormat) { initFormatting(); }
            return picker;
        };

        picker.timeZone = function (newZone) {
            if (arguments.length === 0) { return options.timeZone; }
            if (typeof newZone !== 'string') { throw new TypeError('newZone() expects a string parameter'); }
            options.timeZone = newZone;
            return picker;
        };

        picker.dayViewHeaderFormat = function (newFormat) {
            if (arguments.length === 0) { return options.dayViewHeaderFormat; }
            if (typeof newFormat !== 'string') { throw new TypeError('dayViewHeaderFormat() expects a string parameter'); }
            options.dayViewHeaderFormat = newFormat;
            return picker;
        };

        picker.extraFormats = function (formats) {
            if (arguments.length === 0) { return options.extraFormats; }
            if (formats !== false && !(formats instanceof Array)) { throw new TypeError('extraFormats() expects an array or false parameter'); }
            options.extraFormats = formats;
            if (parseFormats) { initFormatting(); }
            return picker;
        };

        picker.disabledDates = function (dates) {
            if (arguments.length === 0) { return (options.disabledDates ? $.extend({}, options.disabledDates) : options.disabledDates); }
            if (!dates) { options.disabledDates = false; update(); return picker; }
            if (!(dates instanceof Array)) { throw new TypeError('disabledDates() expects an array parameter'); }
            options.disabledDates = indexGivenDates(dates);
            options.enabledDates  = false;
            update();
            return picker;
        };

        picker.enabledDates = function (dates) {
            if (arguments.length === 0) { return (options.enabledDates ? $.extend({}, options.enabledDates) : options.enabledDates); }
            if (!dates) { options.enabledDates = false; update(); return picker; }
            if (!(dates instanceof Array)) { throw new TypeError('enabledDates() expects an array parameter'); }
            options.enabledDates  = indexGivenDates(dates);
            options.disabledDates = false;
            update();
            return picker;
        };

        picker.daysOfWeekDisabled = function (daysOfWeekDisabled) {
            if (arguments.length === 0) { return options.daysOfWeekDisabled.splice(0); }
            if ((typeof daysOfWeekDisabled === 'boolean') && !daysOfWeekDisabled) {
                options.daysOfWeekDisabled = false; update(); return picker;
            }
            if (!(daysOfWeekDisabled instanceof Array)) { throw new TypeError('daysOfWeekDisabled() expects an array parameter'); }
            options.daysOfWeekDisabled = daysOfWeekDisabled.reduce(function (prev, cur) {
                cur = parseInt(cur, 10);
                if (cur > 6 || cur < 0 || isNaN(cur)) { return prev; }
                if (prev.indexOf(cur) === -1) { prev.push(cur); }
                return prev;
            }, []).sort();
            if (options.useCurrent && !options.keepInvalid) {
                var tries = 0;
                while (!isValid(date, 'd')) {
                    date = date.add(1, 'day');
                    if (tries === 31) { throw 'Tried 31 times to find a valid date'; }
                    tries++;
                }
                setValue(date);
            }
            update();
            return picker;
        };

        picker.maxDate = function (maxDate) {
            if (arguments.length === 0) { return options.maxDate ? options.maxDate : options.maxDate; }
            if ((typeof maxDate === 'boolean') && maxDate === false) { options.maxDate = false; update(); return picker; }
            if (typeof maxDate === 'string') {
                if (maxDate === 'now' || maxDate === 'moment') { maxDate = getDayjs(); }
            }
            var parsedDate = parseInputDate(maxDate);
            if (!parsedDate.isValid()) { throw new TypeError('maxDate() Could not parse date parameter: ' + maxDate); }
            if (options.minDate && parsedDate.isBefore(options.minDate)) {
                throw new TypeError('maxDate() date parameter is before options.minDate: ' + parsedDate.format(actualFormat));
            }
            options.maxDate = parsedDate;
            if (options.useCurrent && !options.keepInvalid && date.isAfter(maxDate)) {
                setValue(options.maxDate);
            }
            if (viewDate.isAfter(parsedDate)) {
                viewDate = parsedDate.subtract(options.stepping, 'minute');
            }
            update();
            return picker;
        };

        picker.minDate = function (minDate) {
            if (arguments.length === 0) { return options.minDate ? options.minDate : options.minDate; }
            if ((typeof minDate === 'boolean') && minDate === false) { options.minDate = false; update(); return picker; }
            if (typeof minDate === 'string') {
                if (minDate === 'now' || minDate === 'moment') { minDate = getDayjs(); }
            }
            var parsedDate = parseInputDate(minDate);
            if (!parsedDate.isValid()) { throw new TypeError('minDate() Could not parse date parameter: ' + minDate); }
            if (options.maxDate && parsedDate.isAfter(options.maxDate)) {
                throw new TypeError('minDate() date parameter is after options.maxDate: ' + parsedDate.format(actualFormat));
            }
            options.minDate = parsedDate;
            if (options.useCurrent && !options.keepInvalid && date.isBefore(minDate)) {
                setValue(options.minDate);
            }
            if (viewDate.isBefore(parsedDate)) {
                viewDate = parsedDate.add(options.stepping, 'minute');
            }
            update();
            return picker;
        };

        picker.defaultDate = function (defaultDate) {
            if (arguments.length === 0) { return options.defaultDate ? options.defaultDate : options.defaultDate; }
            if (!defaultDate) { options.defaultDate = false; return picker; }
            if (typeof defaultDate === 'string') {
                if (defaultDate === 'now' || defaultDate === 'moment') {
                    defaultDate = getDayjs();
                } else {
                    defaultDate = getDayjs(defaultDate);
                }
            }
            var parsedDate = parseInputDate(defaultDate);
            if (!parsedDate.isValid()) { throw new TypeError('defaultDate() Could not parse date parameter: ' + defaultDate); }
            if (!isValid(parsedDate)) { throw new TypeError('defaultDate() date passed is invalid according to component setup validations'); }
            options.defaultDate = parsedDate;
            if ((options.defaultDate && options.inline) || input.val().trim() === '') {
                setValue(options.defaultDate);
            }
            return picker;
        };

        picker.locale = function (locale) {
            if (arguments.length === 0) { return options.locale; }
            // [dayjs 변환] moment.localeData(locale) → _hasLocale()
            if (!_hasLocale(locale)) {
                throw new TypeError('locale() locale ' + locale + ' is not loaded from dayjs locales!');
            }
            options.locale = locale;
            // dayjs는 전역 locale 변경 또는 인스턴스별 적용
            date     = _applyLocale(date, options.locale);
            viewDate = _applyLocale(viewDate, options.locale);
            if (actualFormat) { initFormatting(); }
            if (widget) { hide(); show(); }
            return picker;
        };

        picker.stepping = function (stepping) {
            if (arguments.length === 0) { return options.stepping; }
            stepping = parseInt(stepping, 10);
            if (isNaN(stepping) || stepping < 1) { stepping = 1; }
            options.stepping = stepping;
            return picker;
        };

        picker.useCurrent = function (useCurrent) {
            var useCurrentOptions = ['year', 'month', 'day', 'hour', 'minute'];
            if (arguments.length === 0) { return options.useCurrent; }
            if ((typeof useCurrent !== 'boolean') && (typeof useCurrent !== 'string')) {
                throw new TypeError('useCurrent() expects a boolean or string parameter');
            }
            if (typeof useCurrent === 'string' && useCurrentOptions.indexOf(useCurrent.toLowerCase()) === -1) {
                throw new TypeError('useCurrent() expects a string parameter of ' + useCurrentOptions.join(', '));
            }
            options.useCurrent = useCurrent;
            return picker;
        };

        picker.collapse = function (collapse) {
            if (arguments.length === 0) { return options.collapse; }
            if (typeof collapse !== 'boolean') { throw new TypeError('collapse() expects a boolean parameter'); }
            if (options.collapse === collapse) { return picker; }
            options.collapse = collapse;
            if (widget) { hide(); show(); }
            return picker;
        };

        picker.icons = function (icons) {
            if (arguments.length === 0) { return $.extend({}, options.icons); }
            if (!(icons instanceof Object)) { throw new TypeError('icons() expects parameter to be an Object'); }
            $.extend(options.icons, icons);
            if (widget) { hide(); show(); }
            return picker;
        };

        picker.tooltips = function (tooltips) {
            if (arguments.length === 0) { return $.extend({}, options.tooltips); }
            if (!(tooltips instanceof Object)) { throw new TypeError('tooltips() expects parameter to be an Object'); }
            $.extend(options.tooltips, tooltips);
            if (widget) { hide(); show(); }
            return picker;
        };

        picker.useStrict = function (useStrict) {
            if (arguments.length === 0) { return options.useStrict; }
            if (typeof useStrict !== 'boolean') { throw new TypeError('useStrict() expects a boolean parameter'); }
            options.useStrict = useStrict;
            return picker;
        };

        picker.sideBySide = function (sideBySide) {
            if (arguments.length === 0) { return options.sideBySide; }
            if (typeof sideBySide !== 'boolean') { throw new TypeError('sideBySide() expects a boolean parameter'); }
            options.sideBySide = sideBySide;
            if (widget) { hide(); show(); }
            return picker;
        };

        picker.viewMode = function (viewMode) {
            if (arguments.length === 0) { return options.viewMode; }
            if (typeof viewMode !== 'string') { throw new TypeError('viewMode() expects a string parameter'); }
            if (viewModes.indexOf(viewMode) === -1) { throw new TypeError('viewMode() parameter must be one of (' + viewModes.join(', ') + ') value'); }
            options.viewMode    = viewMode;
            currentViewMode = Math.max(viewModes.indexOf(viewMode), minViewModeNumber);
            showMode();
            return picker;
        };

        picker.toolbarPlacement = function (toolbarPlacement) {
            if (arguments.length === 0) { return options.toolbarPlacement; }
            if (typeof toolbarPlacement !== 'string') { throw new TypeError('toolbarPlacement() expects a string parameter'); }
            if (toolbarPlacements.indexOf(toolbarPlacement) === -1) { throw new TypeError('toolbarPlacement() parameter must be one of (' + toolbarPlacements.join(', ') + ') value'); }
            options.toolbarPlacement = toolbarPlacement;
            if (widget) { hide(); show(); }
            return picker;
        };

        picker.widgetPositioning = function (widgetPositioning) {
            if (arguments.length === 0) { return $.extend({}, options.widgetPositioning); }
            if (({}).toString.call(widgetPositioning) !== '[object Object]') { throw new TypeError('widgetPositioning() expects an object variable'); }
            if (widgetPositioning.horizontal) {
                if (typeof widgetPositioning.horizontal !== 'string') { throw new TypeError('widgetPositioning() horizontal variable must be a string'); }
                widgetPositioning.horizontal = widgetPositioning.horizontal.toLowerCase();
                if (horizontalModes.indexOf(widgetPositioning.horizontal) === -1) { throw new TypeError('widgetPositioning() expects horizontal parameter to be one of (' + horizontalModes.join(', ') + ')'); }
                options.widgetPositioning.horizontal = widgetPositioning.horizontal;
            }
            if (widgetPositioning.vertical) {
                if (typeof widgetPositioning.vertical !== 'string') { throw new TypeError('widgetPositioning() vertical variable must be a string'); }
                widgetPositioning.vertical = widgetPositioning.vertical.toLowerCase();
                if (verticalModes.indexOf(widgetPositioning.vertical) === -1) { throw new TypeError('widgetPositioning() expects vertical parameter to be one of (' + verticalModes.join(', ') + ')'); }
                options.widgetPositioning.vertical = widgetPositioning.vertical;
            }
            update();
            return picker;
        };

        picker.calendarWeeks = function (calendarWeeks) {
            if (arguments.length === 0) { return options.calendarWeeks; }
            if (typeof calendarWeeks !== 'boolean') { throw new TypeError('calendarWeeks() expects parameter to be a boolean value'); }
            options.calendarWeeks = calendarWeeks;
            update();
            return picker;
        };

        picker.showTodayButton = function (showTodayButton) {
            if (arguments.length === 0) { return options.showTodayButton; }
            if (typeof showTodayButton !== 'boolean') { throw new TypeError('showTodayButton() expects a boolean parameter'); }
            options.showTodayButton = showTodayButton;
            if (widget) { hide(); show(); }
            return picker;
        };

        picker.showClear = function (showClear) {
            if (arguments.length === 0) { return options.showClear; }
            if (typeof showClear !== 'boolean') { throw new TypeError('showClear() expects a boolean parameter'); }
            options.showClear = showClear;
            if (widget) { hide(); show(); }
            return picker;
        };

        picker.widgetParent = function (widgetParent) {
            if (arguments.length === 0) { return options.widgetParent; }
            if (typeof widgetParent === 'string') { widgetParent = $(widgetParent); }
            if (widgetParent !== null && (typeof widgetParent !== 'string' && !(widgetParent instanceof $))) {
                throw new TypeError('widgetParent() expects a string or a jQuery object parameter');
            }
            options.widgetParent = widgetParent;
            if (widget) { hide(); show(); }
            return picker;
        };

        picker.keepOpen = function (keepOpen) {
            if (arguments.length === 0) { return options.keepOpen; }
            if (typeof keepOpen !== 'boolean') { throw new TypeError('keepOpen() expects a boolean parameter'); }
            options.keepOpen = keepOpen;
            return picker;
        };

        picker.focusOnShow = function (focusOnShow) {
            if (arguments.length === 0) { return options.focusOnShow; }
            if (typeof focusOnShow !== 'boolean') { throw new TypeError('focusOnShow() expects a boolean parameter'); }
            options.focusOnShow = focusOnShow;
            return picker;
        };

        picker.inline = function (inline) {
            if (arguments.length === 0) { return options.inline; }
            if (typeof inline !== 'boolean') { throw new TypeError('inline() expects a boolean parameter'); }
            options.inline = inline;
            return picker;
        };

        picker.clear = function () { clear(); return picker; };

        picker.keyBinds = function (keyBinds) {
            if (arguments.length === 0) { return options.keyBinds; }
            options.keyBinds = keyBinds;
            return picker;
        };

        // [dayjs 변환] getMoment → getDayjs (하위 호환을 위해 getMoment 별칭도 유지)
        picker.getDayjs = function (d) { return getDayjs(d); };
        picker.getMoment = picker.getDayjs; // 하위 호환 별칭

        picker.debug = function (debug) {
            if (typeof debug !== 'boolean') { throw new TypeError('debug() expects a boolean parameter'); }
            options.debug = debug;
            return picker;
        };

        picker.allowInputToggle = function (allowInputToggle) {
            if (arguments.length === 0) { return options.allowInputToggle; }
            if (typeof allowInputToggle !== 'boolean') { throw new TypeError('allowInputToggle() expects a boolean parameter'); }
            options.allowInputToggle = allowInputToggle;
            return picker;
        };

        picker.showClose = function (showClose) {
            if (arguments.length === 0) { return options.showClose; }
            if (typeof showClose !== 'boolean') { throw new TypeError('showClose() expects a boolean parameter'); }
            options.showClose = showClose;
            return picker;
        };

        picker.keepInvalid = function (keepInvalid) {
            if (arguments.length === 0) { return options.keepInvalid; }
            if (typeof keepInvalid !== 'boolean') { throw new TypeError('keepInvalid() expects a boolean parameter'); }
            options.keepInvalid = keepInvalid;
            return picker;
        };

        picker.datepickerInput = function (datepickerInput) {
            if (arguments.length === 0) { return options.datepickerInput; }
            if (typeof datepickerInput !== 'string') { throw new TypeError('datepickerInput() expects a string parameter'); }
            options.datepickerInput = datepickerInput;
            return picker;
        };

        picker.parseInputDate = function (parseInputDate) {
            if (arguments.length === 0) { return options.parseInputDate; }
            if (typeof parseInputDate !== 'function') { throw new TypeError('parseInputDate() should be a function'); }
            options.parseInputDate = parseInputDate;
            return picker;
        };

        picker.disabledTimeIntervals = function (disabledTimeIntervals) {
            if (arguments.length === 0) { return (options.disabledTimeIntervals ? $.extend({}, options.disabledTimeIntervals) : options.disabledTimeIntervals); }
            if (!disabledTimeIntervals) { options.disabledTimeIntervals = false; update(); return picker; }
            if (!(disabledTimeIntervals instanceof Array)) { throw new TypeError('disabledTimeIntervals() expects an array parameter'); }
            options.disabledTimeIntervals = disabledTimeIntervals;
            update();
            return picker;
        };

        picker.disabledHours = function (hours) {
            if (arguments.length === 0) { return (options.disabledHours ? $.extend({}, options.disabledHours) : options.disabledHours); }
            if (!hours) { options.disabledHours = false; update(); return picker; }
            if (!(hours instanceof Array)) { throw new TypeError('disabledHours() expects an array parameter'); }
            options.disabledHours = indexGivenHours(hours);
            options.enabledHours  = false;
            if (options.useCurrent && !options.keepInvalid) {
                var tries = 0;
                while (!isValid(date, 'h')) {
                    date = date.add(1, 'hour');
                    if (tries === 24) { throw 'Tried 24 times to find a valid date'; }
                    tries++;
                }
                setValue(date);
            }
            update();
            return picker;
        };

        picker.enabledHours = function (hours) {
            if (arguments.length === 0) { return (options.enabledHours ? $.extend({}, options.enabledHours) : options.enabledHours); }
            if (!hours) { options.enabledHours = false; update(); return picker; }
            if (!(hours instanceof Array)) { throw new TypeError('enabledHours() expects an array parameter'); }
            options.enabledHours  = indexGivenHours(hours);
            options.disabledHours = false;
            if (options.useCurrent && !options.keepInvalid) {
                var tries = 0;
                while (!isValid(date, 'h')) {
                    date = date.add(1, 'hour');
                    if (tries === 24) { throw 'Tried 24 times to find a valid date'; }
                    tries++;
                }
                setValue(date);
            }
            update();
            return picker;
        };

        picker.viewDate = function (newDate) {
            if (arguments.length === 0) { return viewDate; }
            if (!newDate) { viewDate = date; return picker; }
            if (typeof newDate !== 'string' && !_isDayjs(newDate) && !(newDate instanceof Date)) {
                throw new TypeError('viewDate() parameter must be one of [string, dayjs or Date]');
            }
            viewDate = parseInputDate(newDate);
            viewUpdate();
            return picker;
        };

        // ======================================================
        // 초기화
        // ======================================================

        if (element.is('input')) {
            input = element;
        } else {
            input = element.find(options.datepickerInput);
            if (input.length === 0) {
                input = element.find('input');
            } else if (!input.is('input')) {
                throw new Error('CSS class "' + options.datepickerInput + '" cannot be applied to non input element');
            }
        }

        if (element.hasClass('input-group')) {
            if (element.find('.datepickerbutton').length === 0) {
                component = element.find('.input-group-addon');
            } else {
                component = element.find('.datepickerbutton');
            }
        }

        if (!options.inline && !input.is('input')) {
            throw new Error('Could not initialize DateTimePicker without an input element');
        }

        // [dayjs 변환] moment() → getDayjs()
        date     = getDayjs();
        viewDate = date;

        $.extend(true, options, dataToOptions());
        picker.options(options);
        initFormatting();
        attachDatePickerElementEvents();

        if (input.prop('disabled')) { picker.disable(); }

        if (input.is('input') && input.val().trim().length !== 0) {
            setValue(parseInputDate(input.val().trim()));
        } else if (options.defaultDate && input.attr('placeholder') === undefined) {
            setValue(options.defaultDate);
        }

        if (options.inline) { show(); }

        return picker;
    };

    // =========================================================
    // jQuery plugin
    // =========================================================

    $.fn.datetimepicker = function (options) {
        options = options || {};

        var args        = Array.prototype.slice.call(arguments, 1),
            isInstance  = true,
            thisMethods = ['destroy', 'hide', 'show', 'toggle'],
            returnValue;

        if (typeof options === 'object') {
            return this.each(function () {
                var $this = $(this), _options;
                if (!$this.data('DateTimePicker')) {
                    _options = $.extend(true, {}, $.fn.datetimepicker.defaults, options);
                    $this.data('DateTimePicker', dateTimePicker($this, _options));
                }
            });
        } else if (typeof options === 'string') {
            this.each(function () {
                var $this    = $(this),
                    instance = $this.data('DateTimePicker');
                if (!instance) {
                    throw new Error('bootstrap-datetimepicker("' + options + '") method was called on an element that is not using DateTimePicker');
                }
                returnValue = instance[options].apply(instance, args);
                isInstance  = returnValue === instance;
            });
            if (isInstance || $.inArray(options, thisMethods) > -1) { return this; }
            return returnValue;
        }

        throw new TypeError('Invalid arguments for DateTimePicker: ' + options);
    };

    // [dayjs 변환] defaults: locale → dayjs.locale() 사용
    $.fn.datetimepicker.defaults = {
        timeZone:           '',
        format:             false,
        dayViewHeaderFormat: 'MMMM YYYY',
        extraFormats:       false,
        stepping:           1,
        minDate:            false,
        maxDate:            false,
        useCurrent:         true,
        collapse:           true,
        locale:             dayjs.locale(),   // [dayjs 변환] moment.locale() → dayjs.locale()
        defaultDate:        false,
        disabledDates:      false,
        enabledDates:       false,
        icons: {
            time:     'glyphicon glyphicon-time',
            date:     'glyphicon glyphicon-calendar',
            up:       'glyphicon glyphicon-chevron-up',
            down:     'glyphicon glyphicon-chevron-down',
            previous: 'glyphicon glyphicon-chevron-left',
            next:     'glyphicon glyphicon-chevron-right',
            today:    'glyphicon glyphicon-screenshot',
            clear:    'glyphicon glyphicon-trash',
            close:    'glyphicon glyphicon-remove'
        },
        tooltips: {
            today:           'Go to today',
            clear:           'Clear selection',
            close:           'Close the picker',
            selectMonth:     'Select Month',
            prevMonth:       'Previous Month',
            nextMonth:       'Next Month',
            selectYear:      'Select Year',
            prevYear:        'Previous Year',
            nextYear:        'Next Year',
            selectDecade:    'Select Decade',
            prevDecade:      'Previous Decade',
            nextDecade:      'Next Decade',
            prevCentury:     'Previous Century',
            nextCentury:     'Next Century',
            pickHour:        'Pick Hour',
            incrementHour:   'Increment Hour',
            decrementHour:   'Decrement Hour',
            pickMinute:      'Pick Minute',
            incrementMinute: 'Increment Minute',
            decrementMinute: 'Decrement Minute',
            pickSecond:      'Pick Second',
            incrementSecond: 'Increment Second',
            decrementSecond: 'Decrement Second',
            togglePeriod:    'Toggle Period',
            selectTime:      'Select Time'
        },
        useStrict:            false,
        sideBySide:           false,
        daysOfWeekDisabled:   false,
        calendarWeeks:        false,
        viewMode:             'days',
        toolbarPlacement:     'default',
        showTodayButton:      false,
        showClear:            false,
        showClose:            false,
        widgetPositioning: {
            horizontal: 'auto',
            vertical:   'auto'
        },
        widgetParent:         null,
        ignoreReadonly:       false,
        keepOpen:             false,
        focusOnShow:          true,
        inline:               false,
        keepInvalid:          false,
        datepickerInput:      '.datepickerinput',
        keyBinds: {
            up: function (widget) {
                if (!widget) { return; }
                var d = this.date() || this.getDayjs();
                if (widget.find('.datepicker').is(':visible')) {
                    this.date(d.subtract(7, 'day'));
                } else {
                    this.date(d.add(this.stepping(), 'minute'));
                }
            },
            down: function (widget) {
                if (!widget) { this.show(); return; }
                var d = this.date() || this.getDayjs();
                if (widget.find('.datepicker').is(':visible')) {
                    this.date(d.add(7, 'day'));
                } else {
                    this.date(d.subtract(this.stepping(), 'minute'));
                }
            },
            'control up': function (widget) {
                if (!widget) { return; }
                var d = this.date() || this.getDayjs();
                if (widget.find('.datepicker').is(':visible')) {
                    this.date(d.subtract(1, 'year'));
                } else {
                    this.date(d.add(1, 'hour'));
                }
            },
            'control down': function (widget) {
                if (!widget) { return; }
                var d = this.date() || this.getDayjs();
                if (widget.find('.datepicker').is(':visible')) {
                    this.date(d.add(1, 'year'));
                } else {
                    this.date(d.subtract(1, 'hour'));
                }
            },
            left: function (widget) {
                if (!widget) { return; }
                var d = this.date() || this.getDayjs();
                if (widget.find('.datepicker').is(':visible')) { this.date(d.subtract(1, 'day')); }
            },
            right: function (widget) {
                if (!widget) { return; }
                var d = this.date() || this.getDayjs();
                if (widget.find('.datepicker').is(':visible')) { this.date(d.add(1, 'day')); }
            },
            pageUp: function (widget) {
                if (!widget) { return; }
                var d = this.date() || this.getDayjs();
                if (widget.find('.datepicker').is(':visible')) { this.date(d.subtract(1, 'month')); }
            },
            pageDown: function (widget) {
                if (!widget) { return; }
                var d = this.date() || this.getDayjs();
                if (widget.find('.datepicker').is(':visible')) { this.date(d.add(1, 'month')); }
            },
            enter:   function () { this.hide(); },
            escape:  function () { this.hide(); },
            'control space': function (widget) {
                if (!widget) { return; }
                if (widget.find('.timepicker').is(':visible')) {
                    widget.find('.btn[data-action="togglePeriod"]').click();
                }
            },
            t: function () { this.date(this.getDayjs()); },
            'delete': function () { this.clear(); }
        },
        debug:                false,
        allowInputToggle:     false,
        disabledTimeIntervals: false,
        disabledHours:        false,
        enabledHours:         false,
        viewDate:             false
    };

    return $.fn.datetimepicker;
}));