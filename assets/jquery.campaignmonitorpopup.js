(function($){
  var CampaignMonitorPopup = function (element, options) {
    var settings = {
      CookieName: 'CampaignMonitorPopup',
      SessionCookieName: 'CampaignMonitorPopupSession',
      Visits: [],
      Delay: 10000,
      PageViewNumber: 1,
      CloseSelectors: [],
      ShowSelectors: [],
      ShowPopupOnCurrentPage:false,
      CallBackOnSuccess:null,
      CallBackOnError:null,
      RedirectOnSubmitSuccess:false,
      InnerWrapper:'.modal',
      SignupKey:'signup'
    };
    $.extend(settings, options || {});
    var _VisitingCookieTracker = {
      Status: '',
      PageView: 0,
      Visits: 0,
      PopupAlreadyShownOnVisit: []
    };
    var _CookieValues = {
      NotSubmitted: 'NotSubmitted',
      HasSubmitted: 'HasSubmitted',
      ShowOnNextVisit: 'ShowOnNextVisit',
      ErrorInSubmitted: 'ErrorInSubmitted'
    };
    var _MainWrapper = element;
    var _CMPForm = $('form',_MainWrapper);
    var CMP = {
      Initialize: function () {
        this.Hide(false);
        this.ReadAndSetupCookieValues();
        this.InitCustomEvents();
      },
      InitCustomEvents: function () {
        $(settings.InnerWrapper, _MainWrapper).append('<a class="ss-backspace popupClose"></a>');
        
        for(var i=0;i<settings.CloseSelectors.length;i++){
          var element = $(settings.CloseSelectors[i]);
          element.click(function(e){
            CMP.Hide();
            e.stopPropagation();
            return false;
          });
        }
        for(var i=0;i<settings.ShowSelectors.length;i++){
          var element = $(settings.ShowSelectors[i]);
          element.click(function(e){
            CMP.Show(true);
            e.stopPropagation();
            return false;
          });
        }

        $(document).keydown(function(e){
          keycode = e == null ? event.keyCode : e.which;
          if (keycode == 27){
            CMP.Hide(true);
          }
        });
        
        _MainWrapper.click(function(){
          if($(this).hasClass('modalize')){
          	CMP.Hide(true);
          }
        });
        
        $(settings.InnerWrapper, _MainWrapper).click(function(e){
           	e.stopPropagation();
        });
                
      },
      Hide: function (saveCookie) {
        //_MainWrapper.hide('fast');
        _MainWrapper.removeClass('modalize');
        if (saveCookie) {}
      },
      ReadAndSetupCookieValues: function () {
        var sessionCookie = T3Core.CookieManager.ReadCookie(settings.SessionCookieName);
        var cmpCookieValue = this.ReadJsonFromCookie(settings.CookieName);
        if (cmpCookieValue == null && sessionCookie == null) {
          T3Core.CookieManager.CreateCookie(settings.SessionCookieName, 1);
          this.SaveJsonToCookie(settings.CookieName, _CookieValues.ShowOnNextVisit, 1, 1, '', 30);
          cmpCookieValue = this.ReadJsonFromCookie(settings.CookieName);
        }else {
          //save default values to cookie.
          if (cmpCookieValue == null) {
            this.SaveJsonToCookie(settings.CookieName, _CookieValues.ShowOnNextVisit, 1, 1, '', 30);
            cmpCookieValue = this.ReadJsonFromCookie(settings.CookieName);
          }
          //new session.
          if (sessionCookie == null) {
            var obj = cmpCookieValue;
            var visitNumber = obj.Visits + 1;
            var pageViewNumber = obj.PageView;
            T3Core.CookieManager.CreateCookie(settings.SessionCookieName, visitNumber);
            if (obj.Status == _CookieValues.ShowOnNextVisit) {
              this.SaveJsonToCookie(settings.CookieName, _CookieValues.ShowOnNextVisit, pageViewNumber, visitNumber, '', 30);
            }
          }
        }
        if (cmpCookieValue.Status == _CookieValues.ShowOnNextVisit && settings.ShowPopupOnCurrentPage) {
          CMP.ProcessCookiesValuesAndShowPopupIfNeeded();
        }
      },
      SaveJsonToCookie: function (cookieName, status, pageview, visits, visitpopupshown, duration) {
        _VisitingCookieTracker.Status = status;
        _VisitingCookieTracker.PageView = pageview;
        _VisitingCookieTracker.Visits = visits;
        if (visitpopupshown != '') {
          _VisitingCookieTracker.PopupAlreadyShownOnVisit.push(visitpopupshown);
        }
        T3Core.CookieManager.CreateCookie(cookieName, JSON.stringify(_VisitingCookieTracker), duration);
      },
      ReadJsonFromCookie: function (cookieName) {
        var cookieObj = T3Core.CookieManager.ReadCookie(cookieName);
        var obj = null;
        if (cookieObj != null) {
          try {
            obj = JSON.parse(cookieObj);
          } catch (e) {
            if (cookieObj.indexOf(_CookieValues.HasSubmitted) != -1) {
              CMP.SaveJsonToCookie(cookieName, _CookieValues.HasSubmitted, '', '', '', 365)
              obj = JSON.parse(T3Core.CookieManager.ReadCookie(cookieName));
            }
          }
        }
        return obj;
      },
      ProcessCookiesValuesAndShowPopupIfNeeded: function () {
        var cookieObj = this.ReadJsonFromCookie(settings.CookieName);
        var dataTransferObject = {PageView: 0,Visits: 0,NeedToShowPopupOnCurrentVisit: false,NeedToShowPopupOnCurrentPageView: false,PopupAlreadyShown: false,ShowPopup: false};
        dataTransferObject.PageView = parseInt(cookieObj.PageView);
        dataTransferObject.Visits = parseInt(cookieObj.Visits);
        if (cookieObj.PopupAlreadyShownOnVisit.length > 0) {
          dataTransferObject.PopupAlreadyShown = ($.inArray(dataTransferObject.Visits, cookieObj.PopupAlreadyShownOnVisit) != -1)
        }
        dataTransferObject.NeedToShowPopupOnCurrentVisit = (($.inArray(dataTransferObject.Visits, settings.Visits) != -1) && !dataTransferObject.PopupAlreadyShown);
        dataTransferObject.NeedToShowPopupOnCurrentPageView = (dataTransferObject.PageView == settings.PageViewNumber);
        if (dataTransferObject.NeedToShowPopupOnCurrentVisit) {
          if (dataTransferObject.PageView <= settings.PageViewNumber) {
            if (dataTransferObject.NeedToShowPopupOnCurrentPageView) {
              this.SaveJsonToCookie(settings.CookieName, _CookieValues.ShowOnNextVisit, 1, dataTransferObject.Visits, dataTransferObject.Visits, 30);
            } else {
              var pageview = dataTransferObject.PageView + 1;
              this.SaveJsonToCookie(settings.CookieName, _CookieValues.ShowOnNextVisit, pageview, dataTransferObject.Visits, '', 30);
            }
          }
        }
        if (dataTransferObject.Visits > settings.Visits[settings.Visits.length - 1]) {
          // Visiting number is bigger
        }
        dataTransferObject.ShowPopup = dataTransferObject.NeedToShowPopupOnCurrentVisit && dataTransferObject.NeedToShowPopupOnCurrentPageView;
        if (dataTransferObject.ShowPopup){
          this.Show(false);
        }
      },
      Show: function (clickEvent) {
        var delay = clickEvent ? 1000 : settings.Delay;
        setTimeout(function(){
          //_MainWrapper.show();
          _MainWrapper.addClass('modalize');
          CMP.InitBValidator();
          CMP.InitAjaxSubmit();
        },delay);
      },
      InitBValidator:function(){
        var bValidatorOptions = {singleError:true};
        _CMPForm.bValidator(bValidatorOptions);
      },
      InitAjaxSubmit:function(){
        _CMPForm.submit(function(e){
          var url = this.action + '?callback=?';
          var formData = _CMPForm.serialize();
          $.getJSON(url,formData,CMP.AjaxFormSubmitCallBack);
          e.stopPropagation();
          return false;
        });
      },
      AjaxFormSubmitCallBack:function(data){
        //console.log(data);
        if(data.Status === 200){
          var message = data.Message;
          CMP.SaveJsonToCookie(settings.CookieName,_CookieValues.HasSubmitted,'','','',365);
          if(settings.RedirectOnSubmitSuccess && data.RedirectUrl){
            window.location = data.RedirectUrl;
            return;
          }
          if(settings.CallBackOnSuccess){
            settings.CallBackOnSuccess(data, _MainWrapper);
          }else{
            alert(message);
            CMP.Hide();
          }
        }else{
          if(settings.CallBackOnError){
            settings.CallBackOnError(data);
          }
        }
      }
    };
    (function () {
      var signupkey = T3Core.GetQueryStringByKey(settings.SignupKey);
      if(signupkey != ''){
        if(signupkey == 1){
          CMP.Initialize();
          CMP.Show();
        }
      }else{
        CMP.Initialize();
      }
    })();
  };
  $.fn.CampaignMonitorPopup = function(options){
    return new CampaignMonitorPopup(this,options);
  }
})(jQuery);
//https://gist.github.com/jdennes/1155479