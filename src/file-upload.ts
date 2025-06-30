import { Component, ElementRef, Input, ViewChild } from '@angular/core';

// Component that handles file uploads via both drag-and-drop and manual file input.
// File upload can be toggled off via the `disableFileUpload` flag.
@Component({
  selector: 'app-file-uploader',
  template: '',
})
export class FileUploaderComponent {
  @Input() disableFileUpload = false;
  public isOverDropZone = false;

  // Reference to the drop zone HTML element
  @ViewChild('dropZone') dropZoneRef!: ElementRef<HTMLDivElement>;

  // Simulated values for demonstration
  private mode = 'normal';
  private currentFolder = { parent: 'some/path', name: 'folder' };
  private expandedIndex: number | null = null;

  constructor(private modalService: ModalService, private fileService: FileService) {}

  // Enables drag-and-drop only when in an allowed mode and upload is not disabled.
  private isDragAndDropEnabled(): boolean {
    return (this.mode === 'normal' || this.mode === 'fileSelect') && !this.disableFileUpload;
  }

  onDragOver(event: DragEvent): void {
    if (!this.isDragAndDropEnabled()) return;
    event.preventDefault();
    this.isOverDropZone = true;
  }

  onDragLeave(event: DragEvent): void {
    if (!this.isDragAndDropEnabled()) return;
    event.preventDefault();
    this.isOverDropZone = false;
  }

  // Handles file drop, shows error if multiple files are dropped.
  onDrop(event: DragEvent): void {
    if (!this.isDragAndDropEnabled()) return;
    event.preventDefault();
    this.isOverDropZone = false;
    this.uploadFile(event);
  }

  // Handles file input from drag-and-drop or file selector, limits to a single file
  uploadFile(e: Event | DragEvent) {
    if (this.disableFileUpload) return;

    if (e instanceof DragEvent) {
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      if (files.length > 1) {
        this.modalService.newErrorAcknowledgementModal({
          title: `Please upload only one file at a time.`,
        });
        return;
      }

      const file = files[0];
      this.doUpload(file);
      return;
    }

    const fileInput = e.target as HTMLInputElement;
    if (!fileInput.files || fileInput.files.length === 0) return;

    const file = fileInput.files[0];
    this.doUpload(file, fileInput);
  }
  
  // Uploads file using a service and shows loading + error/success modals.
  doUpload(file: File, fileInput?: HTMLInputElement): void {
    const formData = new FormData();
    formData.append('file', file);

    const modal = this.modalService.newLoadingModal({
      title: `Uploading ${file.name}. Please do not close or refresh tab.`,
    });

    this.fileService
      .uploadFile(`${this.currentFolder.parent}/${this.currentFolder.name}`, formData)
      .then(() => {
        this.expandedIndex = null;
      })
      .catch((err) => {
        if (err instanceof CrystalliserCoreError) {
          this.modalService.newErrorAcknowledgementModal({
            title: `Unable to upload. ${err.detail}`,
          });
        } else {
          this.modalService.newErrorAcknowledgementModal({
            title: `Something went wrong, unable to upload ${file.name}.`,
          });
          console.error(err);
        }
      })
      .finally(() => {
        this.modalService.dismissModal(modal.id);
        if (fileInput) {
          fileInput.value = '';
        }
      });
  }
}
