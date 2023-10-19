import { Component, ViewChild, ViewChildren, ElementRef, QueryList, Renderer2 } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { NgForm } from '@angular/forms';
import { NgbModal, NgbModalRef, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient } from "@angular/common/http";
import { environment } from 'environments/environment';
import swal from 'sweetalert2';
import { ToastsManager } from 'ng2-toastr/ng2-toastr';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-footer',
    templateUrl: './footer.component.html',
    styleUrls: ['./footer.component.scss']
})

export class FooterComponent{

  isHomePage: boolean = false;
  isAboutPage: boolean = false;
  isF29AboutPage: boolean = false;
  modalReference: NgbModalRef;
  sending: boolean = false;
  msgfeedBack: string = '';
  showErrorForm: boolean = false;
  @ViewChild('f') feedbackDownForm: NgForm;
  @ViewChildren('autoajustable') textAreas: QueryList<ElementRef>;

  constructor(private modalService: NgbModal, private http: HttpClient, public toastr: ToastsManager, public translate: TranslateService, private renderer: Renderer2, private router: Router) { 
    this.router.events.filter((event: any) => event instanceof NavigationEnd).subscribe(

      event => {
        var tempUrl = (event.url).toString();
        if (tempUrl.indexOf('/.') != -1 || tempUrl == '/') {
          this.isHomePage = true;
          this.isAboutPage = false;
          this.isF29AboutPage = false;
        } else if (tempUrl.indexOf('/aboutoasisgpt') != -1) {
          this.isHomePage = false;
          this.isAboutPage = true;
          this.isF29AboutPage = false;
        }else if (tempUrl.indexOf('/aboutf29') != -1) {
          this.isHomePage = false;
          this.isAboutPage = false;
          this.isF29AboutPage = true;
        } else {
          this.isHomePage = false;
          this.isAboutPage = false;
          this.isF29AboutPage = false;
        }
      }
    );
  }

  openSupport(content){
    let ngbModalOptions: NgbModalOptions = {
        backdrop: 'static',
        keyboard: false,
        windowClass: 'ModalClass-sm offset-md-3 col-md-6'// xl, lg, sm
      };
    this.modalReference = this.modalService.open(content, ngbModalOptions);
}

submitInvalidForm() {
  this.showErrorForm = true;
  if (!this.feedbackDownForm) { return; }
  const base = this.feedbackDownForm;
  for (const field in base.form.controls) {
      if (!base.form.controls[field].valid) {
          base.form.controls[field].markAsTouched()
      }
  }
}

onSubmitRevolution() {
  this.sending = true;
  var params = {description: this.msgfeedBack};
  this.http.post(environment.serverapi+'/api/sendmsg/', params)
  .subscribe( (res : any) => {
    this.sending = false;
    this.msgfeedBack = '';
    this.modalReference.close();
    swal({
        type: 'success',
        html: this.translate.instant("land.Thank you"),
        showCancelButton: false,
        showConfirmButton: false,
        allowOutsideClick: false
    })
    setTimeout(function () {
        swal.close();
    }, 2000);
   }, (err) => {
     console.log(err);
     this.sending = false;
     this.toastr.error('', this.translate.instant("generics.error try again"));
   });
  
}

resizeTextArea(){
  this.resizeTextAreaFunc(this.textAreas);
}

private resizeTextAreaFunc(elements: QueryList<ElementRef>) {
  elements.forEach((element: ElementRef) => {
    const nativeElement = element.nativeElement;
    this.renderer.listen(nativeElement, 'input', () => {
      let height = nativeElement.scrollHeight;
      if (height < 50) height = 50;
      this.renderer.setStyle(nativeElement, 'height', `${height}px`);
    });
    let height = nativeElement.scrollHeight;
    if (height < 50) height = 50;
    this.renderer.setStyle(nativeElement, 'height', `${height}px`);
  });
}

closeSupport(){
  this.msgfeedBack = '';
  this.modalReference.close();
}

}
