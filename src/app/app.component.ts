import { Component, ViewContainerRef, OnInit } from '@angular/core';
import { ToastsManager } from 'ng2-toastr/ng2-toastr';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap'
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { LangService } from 'app/shared/services/lang.service';
import swal from 'sweetalert2';
import { EventsService} from 'app/shared/services/events.service';


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    providers: [LangService]
})
export class AppComponent implements OnInit{

  secondsInactive:number;
  inactiveSecondsToLogout:number = 60000; // 10 minutoes *2 = 20 minutos  600
  actualPage: string = '';
  isApp: boolean = document.URL.indexOf( 'http://' ) === -1 && document.URL.indexOf( 'https://' ) === -1 && location.hostname != "localhost" && location.hostname != "127.0.0.1";
  hasLocalLang: boolean = false;
    //Set toastr container ref configuration for toastr positioning on screen
    constructor(public toastr: ToastsManager, vRef: ViewContainerRef, private router: Router, private activatedRoute: ActivatedRoute, private titleService: Title, public translate: TranslateService, private eventsService: EventsService) {
        this.toastr.setRootViewContainerRef(vRef);

        this.translate.use('fr');

    }

     ngOnInit(){
       //evento que escucha si ha habido un error de conexión
       this.eventsService.on('http-error', function(error) {
             console.group("HttpErrorHandler");
             console.log(error.status, "status code detected.");
             console.log(error);
             console.groupEnd();
             var msg1 = 'Pas de connexion internet';
             var msg2 = 'Essai de connexion ...';
             swal({
              title: msg1,
              text: msg2,
              type: 'warning',
              showCancelButton: false,
              confirmButtonColor: '#0CC27E',
              confirmButtonText: 'OK',
              showLoaderOnConfirm: true,
              allowOutsideClick: false
          }).then((result) => {
            if (result.value) {
              //location.reload();
              //navigator.app.exitApp();
              this.router.navigateByUrl('/', {skipLocationChange: true}).then(() =>
              this.router.navigate([this.router.url]));
            }

          }).catch(swal.noop);
         }.bind(this));


      //every time you change your route
      this.router.events
      .filter((event) => event instanceof NavigationEnd)
      .map(() => this.activatedRoute)
      .map((route) => {
        while (route.firstChild) route = route.firstChild;
        return route;
      })
      .filter((route) => route.outlet === 'primary')
      .mergeMap((route) => route.data)
      .subscribe((event) => {
        this.titleService.setTitle(this.translate.instant(event['title']));
        //para los anchor de la misma páginano hacer scroll hasta arriba
        if(this.actualPage != event['title']){
          window.scrollTo(0, 0)
        }
        this.actualPage = event['title'];
      });

     }


}
