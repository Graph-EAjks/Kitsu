import { mapActions, mapGetters } from 'vuex'
import {
  formatTime,
  formatFrame,
  ceilToFrame,
  roundToFrame,
  floorToFrame
} from '@/lib/video'

export const playerMixin = {
  emits: ['annotations-refreshed'],

  data() {
    return {
      annotations: [],
      color: '#ff3860',
      currentPreviewIndex: 0,
      currentTime: '00:00.000',
      currentTimeRaw: 0,
      entityList: [],
      entityListToCompare: [],
      framesPerImage: [],
      framesSeenOfPicture: 1,
      fullScreen: false,
      isCommentsHidden: true,
      isComparing: false,
      isDrawing: false,
      isEntitiesHidden: false,
      isHd: false,
      isMuted: false,
      isPlaying: false,
      isRepeating: false,
      isTyping: false,
      maxDuration: '00:00.000',
      maxDurationRaw: 0,
      onNextTimeUpdateActions: [],
      pencil: 'big',
      pencilPalette: ['big', 'medium', 'small'],
      playingEntityIndex: 0,
      playingPreviewFileId: null,
      speed: 3,
      task: null,
      textColor: '#ff3860'
    }
  },

  beforeUnmount() {
    this.endAnnotationSaving()
    this.removeEvents()
    this.leaveRoom()
  },

  computed: {
    ...mapGetters([
      'isCurrentUserArtist',
      'isCurrentUserClient',
      'taskMap',
      'taskTypeMap',
      'user'
    ]),

    // Elements

    container() {
      return this.$refs.container
    },

    rawPlayer() {
      return this.$refs['raw-player']
    },

    rawPlayerComparison() {
      return this.$refs['raw-player-comparison']
    },

    picturePlayer() {
      return this.$refs['picture-player']
    },

    picturePlayerComparison() {
      return this.$refs['picture-player-comparison']
    },

    soundPlayer() {
      return this.$refs['sound-player']
    },

    modelPlayer() {
      return this.$refs['object-player']
    },

    canvas() {
      return this.$refs['canvas-wrapper']
    },

    progress() {
      return this.$refs['video-progress']
    },

    video() {
      return this.$refs.movie
    },

    // File type

    extension() {
      if (!this.currentPreview || !this.currentPreview.extension) return ''
      return this.currentPreview.extension
    },

    isCurrentPreviewMovie() {
      return this.extension === 'mp4'
    },

    isCurrentPreviewPicture() {
      return this.isPicture(this.extension)
    },

    isCurrentPreviewModel() {
      return this.isModel(this.extension)
    },

    isCurrentPreviewSound() {
      return this.isSound(this.extension)
    },

    isCurrentPreviewPdf() {
      return this.isPdf(this.extension)
    },

    isCurrentPreviewFile() {
      return (
        !this.isCurrentPreviewMovie &&
        !this.isCurrentPreviewPicture &&
        !this.isCurrentPreviewSound &&
        !this.isCurrentPreviewModel
      )
    },

    isComparisonOverlay() {
      return this.comparisonMode !== 'sidebyside'
    },

    overlayOpacity() {
      if (this.isComparing && this.isComparisonOverlay) {
        switch (this.comparisonMode) {
          case 'overlay0':
            return 1
          case 'overlay25':
            return 0.25
          case 'overlay50':
            return 0.5
          case 'overlay75':
            return 0.75
          case 'overlay100':
            return 0
          default:
            return 1
        }
      } else {
        return 1
      }
    },

    currentPreviewPath() {
      if (this.currentPreview) {
        let previewId = this.currentPreview.id
        let extension = this.currentPreview.extension
        if (this.currentPreviewIndex > 0) {
          const index = this.currentPreviewIndex - 1
          const preview = this.currentEntity.preview_file_previews[index]
          previewId = preview.id
          extension = preview.extension
        }
        return `/api/pictures/originals/preview-files/${previewId}.${extension}`
      } else {
        return ''
      }
    },

    currentComparisonPreviewPath() {
      if (
        this.currentPreviewToCompare &&
        (this.isPictureComparison || this.isMovieComparison)
      ) {
        const extension = this.currentPreviewToCompare.extension
        const previewId = this.currentPreviewToCompare.id
        if (this.isPictureComparison) {
          return `/api/pictures/originals/preview-files/${previewId}.${extension}`
        } else {
          return `/api/movies/originals/preview-files/${previewId}.${extension}`
        }
      } else {
        return ''
      }
    },

    currentPreviewDlPath() {
      if (!this.currentPreview) return ''
      const previewId = this.currentPreview.id
      return `/api/pictures/originals/preview-files/${previewId}/download`
    },

    currentEntity() {
      return this.entityList[this.playingEntityIndex]
    },

    currentPreview() {
      if (!this.currentEntity) return null
      if (this.currentPreviewIndex === 0) {
        return {
          id: this.currentEntity.preview_file_id,
          extension: this.currentEntity.preview_file_extension,
          task_id: this.currentEntity.preview_file_task_id,
          revision: this.currentEntity.preview_file_revision,
          width: this.currentEntity.preview_file_width,
          height: this.currentEntity.preview_file_height,
          annotations: this.currentEntity.preview_file_annotations || [],
          duration: this.currentEntity.preview_file_duration || 0
        }
      } else {
        return this.currentEntity.preview_file_previews[
          this.currentPreviewIndex - 1
        ]
      }
    },

    currentEntityPreviewLength() {
      if (!this.currentEntity || !this.currentEntity.preview_file_previews) {
        return 0
      }
      return this.currentEntity.preview_file_previews.length + 1
    },

    isFullScreenEnabled() {
      return !!(
        document.fullscreenEnabled ||
        document.mozFullScreenEnabled ||
        document.msFullscreenEnabled ||
        document.webkitSupportsFullscreen ||
        document.webkitFullscreenEnabled ||
        document.createElement('video').webkitRequestFullScreen
      )
    },

    // Frames

    frameDuration() {
      return Math.round((1 / this.fps) * 10000) / 10000
    },

    fps() {
      return parseFloat(this.currentProduction?.fps) || 25
    },

    frameNumber() {
      if (this.isCurrentPreviewPicture) {
        return this.framesSeenOfPicture - 1
      }
      let frameNumber = this.currentTimeRaw / this.frameDuration
      if (frameNumber >= this.nbFrames) {
        frameNumber = this.nbFrames
      }
      return Math.round(frameNumber) - 1
    },

    currentFrame() {
      return formatFrame(this.frameNumber + 2)
    },

    currentFrameMovieOrPicture() {
      if (this.isCurrentPreviewMovie) {
        return parseInt(this.currentFrame)
      } else if (this.isCurrentPreviewPicture) {
        return this.framesSeenOfPicture
      }
      return 0
    },

    nbFrames() {
      const isChromium = !!window.chrome
      const change = isChromium ? this.frameDuration : 0
      const duration =
        this.currentPreview && this.currentPreview.duration
          ? this.currentPreview.duration
          : this.maxDurationRaw + change
      return Math.round(duration * this.fps)
    }
  },

  methods: {
    ...mapActions(['refreshPreview']),

    isMovie(extension) {
      return extension === 'mp4'
    },

    isPicture(extension) {
      return ['gif', 'png', 'jpg', 'jpeg'].includes(extension)
    },

    isModel(extension) {
      return ['glb', 'gltf'].includes(extension)
    },

    isSound(extension) {
      return ['mp3', 'wav'].includes(extension)
    },

    isPdf(extension) {
      return extension === 'pdf'
    },

    exists(variable) {
      return variable !== null && variable !== undefined
    },

    configureEvents() {
      window.addEventListener('keydown', this.onKeyDown, false)
      window.addEventListener('resize', this.onWindowResize)
      if (!this.$el.nomousemove) this.$el.onmousemove = this.onMouseMove
      if (this.container) {
        this.container.addEventListener(
          'fullscreenchange',
          this.onFullScreenChange,
          false
        )
        this.container.addEventListener(
          'mozfullscreenchange',
          this.onFullScreenChange,
          false
        )
        this.container.addEventListener(
          'MSFullscreenChange',
          this.onFullScreenChange,
          false
        )
        this.container.addEventListener(
          'webkitfullscreenchange',
          this.onFullScreenChange,
          false
        )
      }
      window.addEventListener('beforeunload', this.onWindowsClosed)
    },

    removeEvents() {
      window.removeEventListener('keydown', this.onKeyDown)
      window.removeEventListener('resize', this.onWindowResize)
      window.removeEventListener('beforeunload', this.onWindowsClosed)
      this.$el.onmousemove = null
      if (this.container) {
        this.container.removeEventListener(
          'fullscreenchange',
          this.onFullScreenChange,
          false
        )
        this.container.removeEventListener(
          'mozfullscreenchange',
          this.onFullScreenChange,
          false
        )
        this.container.removeEventListener(
          'MSFullscreenChange',
          this.onFullScreenChange,
          false
        )
        this.container.removeEventListener(
          'webkitfullscreenchange',
          this.onFullScreenChange,
          false
        )
      }
    },
    formatTime,

    displayBars() {
      if (this.$refs['button-bar']) {
        if (this.$refs.header) {
          this.$refs.header.style.opacity = 1
        }
        if (this.$refs['button-bar']) {
          this.$refs['button-bar'].style.opacity = 1
        }
        if (this.$refs['video-progress']) {
          this.$refs['video-progress'].$el.style.opacity = 1
        }
        this.container.style.cursor = 'default'
      }
    },

    hideBars() {
      if (this.$refs.header) {
        this.$refs.header.style.opacity = 0
      }
      if (this.$refs['button-bar']) {
        this.$refs['button-bar'].style.opacity = 0
      }
      if (this.$refs['video-progress']) {
        this.$refs['video-progress'].$el.style.opacity = 0
      }
    },

    updateTaskPanel() {
      if (this.entityList.length > 0) {
        const entity = this.entityList[this.playingEntityIndex]
        if (entity) this.task = this.taskMap.get(entity.preview_file_task_id)
        else this.task = null
      } else {
        this.task = null
      }
    },

    updateProgressBar() {
      if (this.progress) {
        this.progress.updateProgressBar(this.frameNumber)
      }
    },

    playClicked() {
      this.play()
      this.updateRoomStatus()
    },

    pauseClicked() {
      this.pause()
      this.updateRoomStatus()
    },

    play() {
      if (this.playingPictureTimeout) clearTimeout(this.playingPictureTimeout)
      if (this.isFullMode) {
        if (
          this.fullPlayer.currentTime >=
          this.fullPlayer.duration - this.frameDuration
        ) {
          this.setPlaylistProgress(0)
          this.progress.updateProgressBar(0)
          this.$nextTick(this.playFullBuild)
        } else {
          this.playFullBuild()
        }
      } else if (this.isCurrentPreviewPicture) {
        this.playPicture()
      } else if (this.isCurrentPreviewSound) {
        this.playSound()
      } else if (this.isCurrentPreviewModel) {
        this.playModel()
      } else {
        if (!this.rawPlayer) return
        this._setCurrentTimeOnHandleIn()
        this.rawPlayer.play()
        if (this.isComparing) {
          this.rawPlayerComparison.play()
        }
        this.isPlaying = this.rawPlayer.isPlaying
      }
      this.clearCanvas()
    },

    playFullBuild() {
      this.fullPlayer.play()
      this.isPlaying = true
      this._runPlaylistProgressUpdateLoop()
    },

    _setCurrentTimeOnHandleIn() {
      if (this.handleIn > 1 && this.frameNumber < this.handleIn) {
        this.rawPlayer.setCurrentTimeRaw(this.handleIn * this.frameDuration)
        this.syncComparisonPlayer()
      }
    },

    _runPlaylistProgressUpdateLoop() {
      clearInterval(this.$options.playLoop)
      this.$options.playLoop = setInterval(() => {
        this.setPlaylistProgress(this.fullPlayer.currentTime)
        if (this.currentEntity) {
          const entityTime =
            this.fullPlayer.currentTime - this.currentEntity.start_duration
          const frame = entityTime * this.fps
          this.progress.updateProgressBar(frame)
        }
      }, 1000 / this.fps)
    },

    _stopPlaylistProgressUpdateLoop() {
      clearInterval(this.$options.playLoop)
    },

    pause() {
      this.resetCanvasVisibility()

      if (this.isFullMode) {
        this.fullPlayer.pause()
        this.isPlaying = false
        this._stopPlaylistProgressUpdateLoop()
      } else if (this.isCurrentPreviewMovie) {
        const comparisonPlayer = this.$refs['raw-player-comparison']
        let currentTime = 0
        if (this.rawPlayer) {
          currentTime = ceilToFrame(
            this.rawPlayer.getCurrentTimeRaw(),
            this.fps
          )
        }
        if (this.rawPlayer) this.rawPlayer.pause()
        if (comparisonPlayer) comparisonPlayer.pause()
        if (comparisonPlayer) {
          this.rawPlayer.setCurrentTimeRaw(currentTime)
          comparisonPlayer.setCurrentTimeRaw(currentTime)
        }
      } else if (this.isCurrentPreviewSound) {
        this.soundPlayer?.pause()
      } else if (this.isCurrentPreviewModel) {
        this.modelPlayer?.pause()
      }
      this.isPlaying = false
    },

    playEntity(entityIndex, updateFullPlaylist = true, frame = -1) {
      const entity = this.entityList[entityIndex]
      const wasDrawing = this.isDrawing === true
      this.clearCanvas()
      this.framesSeenOfPicture = 1
      this.playingEntityIndex = entityIndex
      if (entity && this.isMovie(entity.preview_file_extension)) {
        this.$nextTick(() => {
          this.scrollToEntity(this.playingEntityIndex)
          this.rawPlayer.loadEntity(entityIndex)
          this.annotations = entity.preview_file_annotations || []
          this.onProgressChanged(frame + 1, false)
          if (this.isComparing) {
            this.$refs['raw-player-comparison'].loadEntity(entityIndex)
          }
          if (this.isPlaying) {
            if (!this.isFullMode) {
              this.rawPlayer.play()
              if (this.isComparing) this.$refs['raw-player-comparison'].play()
            }
          } else {
            if (updateFullPlaylist) {
              if (this.isFullMode && !this.isPlaying) {
                this.fullPlayer.currentTime = entity.start_duration
                this.playlistProgress = entity.start_duration
              } else if (!this.isFullMode) {
                this.playlistProgress = entity.start_duration
              }
            }
            this.resetCanvasVisibility()
          }
        })
      } else {
        const annotation = this.getAnnotation(0)
        if (!this.isPlaying) this.loadAnnotation(annotation)
        if (wasDrawing) {
          setTimeout(() => {
            this.isDrawing = true
            this.setAnnotationDrawingMode(true)
          }, 100)
        }
        if (
          this.isPlaying &&
          entity &&
          this.isPicture(entity.preview_file_extension)
        ) {
          this.playPicture()
        }
      }
      this.scrollToEntity(this.playingEntityIndex)
    },

    syncComparisonPlayer() {
      if (
        this.rawPlayer &&
        this.rawPlayerComparison &&
        this.isComparing &&
        this.rawPlayerComparison.currentPlayer
      ) {
        const currentTimeRaw = Number(
          this.rawPlayer.getCurrentTimeRaw().toPrecision(4)
        )
        this.rawPlayerComparison.setCurrentTimeRaw(currentTimeRaw)
      }
    },

    goPreviousFrame() {
      this.clearCanvas()
      if (this.isFullMode) {
        let previousFrameTime = this.fullPlayer.currentTime - this.frameDuration
        const previousFrame = Math.round(previousFrameTime * this.fps)
        const entityPosition = this.playlistShotPosition[previousFrame]
        if (!entityPosition) return

        const entityIndex = entityPosition.index
        const entity = this.entityList[entityIndex]
        if (entityIndex !== this.playingEntityIndex) {
          const shotTime = entity.preview_file_duration
          const endFrame = Math.round(shotTime * this.fps)
          this.playEntity(entityIndex, false, endFrame)
          this.onProgressChanged(endFrame, false)
        }
        previousFrameTime = previousFrame / this.fps
        this.setFullPlayerTime(previousFrameTime)
      } else {
        if (!this.rawPlayer) return
        this.rawPlayer.goPreviousFrame()
        if (this.isComparing) this.syncComparisonPlayer()
        const annotation = this.getAnnotation(this.rawPlayer.getCurrentTime())
        if (annotation) this.loadSingleAnnotation(annotation)
      }
    },

    goNextFrame() {
      this.clearCanvas()
      if (this.isFullMode) {
        let nextFrameTime = this.fullPlayer.currentTime + this.frameDuration
        const nextFrame = Math.round(nextFrameTime * this.fps)
        const entityIndex = this.playlistShotPosition[nextFrame].index
        if (entityIndex !== this.playingEntityIndex) {
          this.playEntity(entityIndex, false)
        }
        nextFrameTime = nextFrame / this.fps
        this.setFullPlayerTime(nextFrameTime)
      } else {
        if (!this.rawPlayer) return
        const nextFrameTime =
          this.rawPlayer.getCurrentTimeRaw() + this.frameDuration + 0.0001
        const nextFrame = Math.round(nextFrameTime * this.fps)
        if (nextFrame >= this.nbFrames) return

        this.rawPlayer.goNextFrame()
        if (this.isComparing) this.syncComparisonPlayer()
        const annotation = this.getAnnotation(this.rawPlayer.getCurrentTime())
        if (annotation) this.loadSingleAnnotation(annotation)
      }
    },

    goPreviousDrawing() {
      try {
        this.clearCanvas()
        const annotation_time =
          Number(this.getPreviousAnnotationTime(this.currentTimeRaw).frame) - 1
        if (this.isFullMode) {
          const nextDrawingTime = annotation_time / this.fps
          this.setFullPlayerTime(nextDrawingTime)
        } else {
          this.rawPlayer.setCurrentTimeRaw(annotation_time / this.fps)
          this.onProgressChanged(annotation_time, true)
        }
        if (this.isComparing) {
          this.syncComparisonViewer()
        }
      } catch (err) {
        console.error('wrong call from unexpected player', err)
        return // has been called from within PreviewPlayer and returned null
      }
    },

    goNextDrawing() {
      try {
        this.clearCanvas()
        const annotation_time =
          Number(this.getNextAnnotationTime(this.currentTimeRaw).frame) - 1
        if (this.isFullMode) {
          const nextDrawingTime = annotation_time / this.fps
          this.setFullPlayerTime(nextDrawingTime)
        } else {
          this.rawPlayer.setCurrentTimeRaw(annotation_time / this.fps)
          this.onProgressChanged(annotation_time, true)
        }
        if (this.isComparing) {
          this.syncComparisonViewer()
        }
      } catch (err) {
        console.error('wrong call from unexpected player', err)
        return // has been called from within PreviewPlayer and returned null
      }
    },

    setFullPlayerTime(newTime) {
      if (!this.currentEntity) return
      this.fullPlayer.currentTime = newTime
      this.setPlaylistProgress(newTime)
      const entityTime = newTime - this.currentEntity.start_duration
      const frame = entityTime * this.fps
      this.progress.updateProgressBar(frame + 1)
    },

    setFullScreen() {
      if (this.container.requestFullscreen) {
        this.container.requestFullscreen()
      } else if (this.container.mozRequestFullScreen) {
        this.container.mozRequestFullScreen()
      } else if (this.container.webkitRequestFullScreen) {
        this.container.webkitRequestFullScreen()
      } else if (this.container.msRequestFullscreen) {
        this.container.msRequestFullscreen()
      }
      this.container.setAttribute('data-fullscreen', !!true)
      document.activeElement.blur()
      this.fullScreen = true
    },

    exitFullScreen() {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen()
      } else if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen()
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen()
      }
      this.container.setAttribute('data-fullscreen', !!false)
      document.activeElement.blur()
      this.fullScreen = false
      setTimeout(() => {
        this.triggerResize()
      }, 200)
      setTimeout(() => {
        this.triggerResize()
      }, 500)
    },

    isFullScreen() {
      return !!(
        document.fullscreen ||
        document.webkitIsFullScreen ||
        document.mozFullScreen ||
        document.msFullscreenElement ||
        document.fullscreenElement
      )
    },

    onScrubStart() {
      if (this.$refs['button-bar']) {
        this.$refs['button-bar'].classList.add('unselectable')
      }
    },

    onScrubEnd() {
      if (this.$refs['button-bar']) {
        this.$refs['button-bar'].classList.remove('unselectable')
      }
    },

    onProgressChanged(frameNumber, updatePlaylistProgress = true) {
      this.clearCanvas()
      this.reloadAnnotations(false)

      if (this.isCurrentPreviewPicture) {
        this.framesSeenOfPicture = frameNumber + 1
      } else {
        this.rawPlayer.setCurrentFrame(frameNumber)
        this.syncComparisonPlayer()
      }

      const annotation = this.getAnnotation(frameNumber * this.frameDuration)
      if (annotation) this.loadAnnotation(annotation)

      this.sendUpdatePlayingStatus()
      this.onFrameUpdate(frameNumber)

      if (this.isFullMode && updatePlaylistProgress) {
        const start = this.currentEntity.start_duration
        const time = (frameNumber - 1) / this.fps + start
        this.fullPlayer.currentTime = time
        this.playlistProgress = time
      }
    },

    onHandleInChanged({ frameNumber, save }) {
      this.handleIn = frameNumber
      if (save) this._saveHandles()
      this.updateRoomStatus()
    },

    onHandleOutChanged({ frameNumber, save }) {
      this.handleOut = frameNumber
      if (save) this._saveHandles()
      this.updateRoomStatus()
    },

    _saveHandles() {
      const shot = this.shotMap.get(this.currentEntity.id)
      const editedShot = {
        id: shot.id,
        data: { ...shot.data }
      }
      editedShot.data.handle_in = this.handleIn
      editedShot.data.handle_out = this.handleOut
      this.editShot(editedShot)
    },

    onPreviousFrameClicked() {
      this.clearFocus()
      this.goPreviousFrame()
      this.sendUpdatePlayingStatus()
    },

    onNextFrameClicked() {
      this.clearFocus()
      this.goNextFrame()
      this.sendUpdatePlayingStatus()
    },

    onPreviousDrawingClicked() {
      this.clearFocus()
      this.goPreviousDrawing()
      this.sendUpdatePlayingStatus()
    },

    onNextDrawingClicked() {
      this.clearFocus()
      this.goNextDrawing()
      this.sendUpdatePlayingStatus()
    },

    onPlayPauseClicked() {
      this.clearFocus()
      if (!this.isPlaying) {
        this.playClicked()
      } else {
        this.pauseClicked()
        const annotation = this.getAnnotation(this.rawPlayer.getCurrentTime())
        if (annotation) this.loadAnnotation(annotation)
        this.updateRoomStatus()
      }
    },

    onVideoRepeated() {
      if (!this.isCommentsHidden) {
        this.clearFocus()
      }
      if (this.isComparing) {
        this.syncComparisonPlayer()
        this.rawPlayerComparison.play()
      }
    },

    onRepeatClicked() {
      this.clearFocus()
      this.isRepeating = !this.isRepeating
      this.updateRoomStatus()
    },

    onToggleSoundClicked() {
      this.clearFocus()
      this.isMuted = !this.isMuted
    },

    onFullScreenChange() {
      if (this.fullScreen && !this.isFullScreen()) {
        this.fullScreen = false
        setTimeout(() => {
          this.triggerResize()
        }, 200)
        setTimeout(() => {
          this.triggerResize()
        }, 500)
      }
    },

    onFullscreenClicked() {
      if (this.isFullScreen()) {
        this.removeTypeArea()
        this.exitFullScreen()
      } else {
        this.addTypeArea()
        this.setFullScreen()
      }
    },

    onKeyDown(event) {
      this.displayBars()
      const HOMEKEY = 36
      const ENDKEY = 35
      const LEFTKEY = 37
      const RIGHTKEY = 39
      const PREVANNKEY = ','
      const NEXTANNKEY = '.'
      const OKEY = 'o'

      if (!['INPUT', 'TEXTAREA'].includes(event.target.tagName)) {
        if (
          (event.keyCode === 46 || event.keyCode === 8) &&
          this.fabricCanvas
        ) {
          this.deleteSelection()
        } else if (event.keyCode === LEFTKEY) {
          // left
          event.preventDefault()
          event.stopPropagation()
          // ctrl + shift + left
          if (
            (event.ctrlKey || event.metaKey) &&
            event.shiftKey &&
            this.moveSelectedEntityToLeft
          ) {
            this.moveSelectedEntityToLeft()
          } else if (event.altKey) {
            this.onPlayPreviousEntityClicked()
            this.$nextTick(() => {
              this.rawPlayer.setCurrentFrame(this.nbFrames - 1)
              if (this.isFullMode) {
                const time =
                  this.currentEntity.start_duration +
                  this.currentEntity.preview_file_duration -
                  this.frameDuration
                this.fullPlayer.currentTime = time
                this.playlistProgress = time
                this.setCurrentTimeRaw(
                  this.currentEntity.preview_file_duration - this.frameDuration
                )
                this.updateProgressBar()
              }
            })
          } else {
            this.onPreviousFrameClicked()
          }
        } else if (event.keyCode === RIGHTKEY) {
          event.preventDefault()
          event.stopPropagation()
          // ctrl + shift + right
          if (
            (event.ctrlKey || event.metaKey) &&
            event.shiftKey &&
            this.moveSelectedEntityToLeft
          ) {
            this.moveSelectedEntityToRight()
          } else if (event.altKey) {
            this.onPlayNextEntityClicked()
            this.$nextTick(() => {
              this.rawPlayer.setCurrentFrame(0)
            })
          } else {
            this.onNextFrameClicked()
          }
        } else if (event.keyCode === 32) {
          event.preventDefault()
          event.stopPropagation()
          this.onPlayPauseClicked()
        } else if (event.altKey && event.keyCode === 74) {
          // alt+j
          event.preventDefault()
          event.stopPropagation()
          this.onPlayPreviousEntityClicked()
        } else if (event.altKey && event.keyCode === 75) {
          // alt+k
          event.preventDefault()
          event.stopPropagation()
          this.onPlayNextEntityClicked()
        } else if ((event.ctrlKey || event.metaKey) && event.keyCode === 67) {
          // ctrl + c
          this.copyAnnotations()
        } else if ((event.ctrlKey || event.metaKey) && event.keyCode === 86) {
          // ctrl + v
          this.pasteAnnotations()
        } else if (event.key === NEXTANNKEY) {
          event.preventDefault()
          event.stopPropagation()
          this.onNextDrawingClicked()
        } else if (event.key === PREVANNKEY) {
          event.preventDefault()
          event.stopPropagation()
          this.onPreviousDrawingClicked()
        } else if (event.altKey && event.key === OKEY) {
          event.preventDefault()
          event.stopPropagation()
          this.toggleFullOverlayComparison()
        } else if (
          (event.ctrlKey || event.metaKey) &&
          event.altKey &&
          event.keyCode === 68
        ) {
          this.onAnnotateClicked()
        } else if ((event.ctrlKey || event.metaKey) && event.keyCode === 90) {
          event.preventDefault()
          this.undoLastAction()
        } else if (event.altKey && event.keyCode === 82) {
          this.redoLastAction()
        } else if (event.keyCode === HOMEKEY) {
          if (this.rawPlayer) this.rawPlayer.setCurrentFrame(0)
        } else if (event.keyCode === ENDKEY) {
          if (this.rawPlayer) {
            this.rawPlayer.setCurrentFrame(this.nbFrames - 1)
          }
        }
      }
    },

    onWindowResize() {
      const now = new Date().getTime()
      this.lastCall = this.lastCall || 0
      if (now - this.lastCall > 600) {
        this.lastCall = now
        setTimeout(() => {
          this.resetHeight()
          this.resizeAnnotations()
        }, 200)
      }
    },

    async toggleFullOverlayComparison() {
      if (!this.isComparing) {
        this.isComparing = true
        await this.$nextTick()
        await this.$nextTick()
      }
      this.$nextTick(() => {
        if (this.comparisonMode === 'overlay100') {
          this.comparisonMode = 'overlay0'
        } else {
          this.comparisonMode = 'overlay100'
        }
      })
    },

    reloadAnnotations(current = true) {
      if (!this.annotations) return
      this.annotations = this.annotations.map(a => ({ ...a }))
      if (current) {
        this.reloadCurrentAnnotation()
      }
    },

    onFilmClicked() {
      this.isEntitiesHidden = !this.isEntitiesHidden
      this.triggerResize()
      this.$nextTick(() => {
        this.resetHeight()
        this.scrollToEntity(this.playingEntityIndex)
      })
    },

    getCurrentTime() {
      const time = roundToFrame(this.currentTimeRaw, this.fps) || 0
      return Number(time.toPrecision(4))
    },

    getCurrentFrame() {
      if (this.currentFrame) {
        return this.currentFrame
      } else {
        const time = roundToFrame(this.currentTimeRaw, this.fps) || 0
        return Math.round(time / this.frameDuration)
      }
    },

    setCurrentTimeRaw(time) {
      const roundedTime = roundToFrame(time, this.fps) || 0
      const frameNumber = roundedTime / this.frameDuration
      if (this.rawPlayer) {
        this.rawPlayer.setCurrentFrame(frameNumber)
        this.syncComparisonPlayer()
        const isChromium = !!window.chrome
        const change = isChromium ? 0.0001 : 0
        this.currentTimeRaw = Number((roundedTime + change).toPrecision(4))
        this.updateProgressBar()
      }
      return roundedTime
    },

    reloadCurrentAnnotation() {
      let currentTime = roundToFrame(this.currentTimeRaw, this.fps) || 0
      if (this.isCurrentPreviewPicture) currentTime = 0
      const annotation = this.getAnnotation(currentTime)
      if (annotation) this.loadAnnotation(annotation)
    },

    getSortedAnnotations() {
      const annotations = this.annotations
      annotations.sort((a, b) => a.time - b.time)
      return annotations
    },

    getNextAnnotationTime(time) {
      const annotations = this.getSortedAnnotations()
      if (this.isMovie) {
        time = roundToFrame(time, this.fps)
        return annotations.find(annotation => {
          return roundToFrame(annotation.time, this.fps) > time + 0.0001
        })
      } else if (this.isPicture) {
        return annotations.find(annotation => annotation.time === 0)
      }
    },

    getPreviousAnnotationTime(time) {
      const annotations = this.getSortedAnnotations()
      if (this.isMovie) {
        time = roundToFrame(time, this.fps)
        return annotations.findLast(annotation => {
          return (
            roundToFrame(annotation.time, this.fps) <
            time - 1 / this.fps + 0.0001
          )
        })
      } else if (this.isPicture) {
        return annotations.find(annotation => annotation.time === 0)
      }
    },

    onCommentClicked() {
      const height = this.$refs['video-container'].offsetHeight
      this.isCommentsHidden = !this.isCommentsHidden
      if (!this.isCommentsHidden) {
        this.$refs['task-info'].$el.style.height = `${height}px`
      }
      this.triggerResize()
      this.$nextTick(() => {
        this.$refs['task-info'].focusCommentTextarea()
        this.resetHeight()
      })
    },

    onCompareClicked() {
      this.isComparing = !this.isComparing
      this.$nextTick(() => {
        this.saveUserComparisonChoice()
        this.comparisonEntityMissing = false
      })
      this.updateRoomStatus()
    },

    onSpeedClicked() {
      const rates = [0.25, 0.5, 1, 1.5, 2]
      this.speed = (this.speed % rates.length) + 1
      const rate = rates[this.speed - 1]
      this.setPlayerSpeed(rate)
      this.updateRoomStatus()
    },

    setPlayerSpeed(rate) {
      if (this.rawPlayer) this.rawPlayer.setSpeed(rate)
      if (this.rawPlayerComparison) this.rawPlayerComparison.setSpeed(rate)
    },

    onFrameUpdate(frame) {
      const isChromium = !!window.chrome
      const change = isChromium ? 0.0001 : 0
      this.currentTimeRaw = Number(
        (frame * this.frameDuration + change).toPrecision(4)
      )
      this.currentTime = this.formatTime(this.currentTimeRaw, this.fps)
      this.updateProgressBar()
      if (this.isShowAnnotationsWhilePlaying) {
        const annotation = this.getAnnotation(this.currentTimeRaw)
        if (annotation) {
          this.clearCanvas()
          this.loadSingleAnnotation(annotation)
        } else {
          this.clearCanvas()
        }
      }
      if (
        this.playlist &&
        this.playlist.for_entity === 'shot' &&
        this.handleOut < this.nbFrames &&
        this.frameNumber >= this.handleOut &&
        this.isPlaying
      ) {
        if (this.isRepeating) {
          this.rawPlayer.setCurrentFrame(this.handleIn)
          this.rawPlayerComparison.setCurrentFrame(this.handleIn)
        } else {
          this.onPlayNext()
        }
      }

      if (
        this.isCurrentPreviewMovie &&
        this.wavesurfer &&
        this.isWaveformDisplayed
      ) {
        const position = this.currentTimeRaw / this.maxDurationRaw
        this.wavesurfer.seekTo(position)
      }
      this.$nextTick(() => {
        const actions = this.onNextTimeUpdateActions
        actions.forEach(action => action())
        this.onNextTimeUpdateActions = []
      })
    },

    onMaxDurationUpdate(duration) {
      if (duration) {
        duration = floorToFrame(duration, this.fps)
        this.maxDurationRaw = duration
        this.maxDuration = this.formatTime(duration, this.fps)
        if (this.resetHandles) this.resetHandles()
      } else {
        this.maxDurationRaw = 0
        this.maxDuration = '00.00.000'
      }
    },

    onMouseMove() {
      const buttonBar = this.$refs['button-bar']
      if (buttonBar && buttonBar.style.opacity !== 1) {
        this.displayBars()
      }
      const isMovieFullScreen =
        this.isFullScreen() && this.isEntitiesHidden && this.isCommentsHidden
      if (isMovieFullScreen) {
        if (this.timer) clearTimeout(this.timer)
        this.timer = setTimeout(() => {
          const isMovieFullScreen =
            this.isFullScreen() &&
            this.isEntitiesHidden &&
            this.isCommentsHidden
          if (isMovieFullScreen) this.hideBars()
        }, 2000)
      }
    },

    playPicture() {
      if (this.playingPictureTimeout) clearTimeout(this.playingPictureTimeout)
      this.framesSeenOfPicture = 1
      this.isPlaying = true
      this.playingPictureTimeout = setTimeout(() => {
        this.continuePlayingPlaylist(
          this.playingEntityIndex,
          Date.now() - (1000 * this.framesSeenOfPicture) / this.fps
        )
      }, 100)
    },

    playSound() {
      if (this.playingPictureTimeout) clearTimeout(this.playingPictureTimeout)
      this.isPlaying = true
      if (this.isCurrentPreviewSound) {
        this.soundPlayer?.play()
      }
    },

    playModel() {
      if (this.playingPictureTimeout) clearTimeout(this.playingPictureTimeout)
      this.isPlaying = true
      this.modelPlayer?.play(this.objectModel.currentAnimation)
    },

    resetCanvasSize() {
      return this.$nextTick().then(() => {
        if (this.isCurrentPreviewMovie && this.isAnnotationCanvas()) {
          if (this.canvas) {
            // Video Ratio
            const ratio = this.rawPlayer.getVideoRatio()

            // Container size
            const fullWidth = this.rawPlayer.$el.offsetWidth
            const fullHeight = this.rawPlayer.$el.offsetHeight
            const width = ratio ? fullHeight * ratio : fullWidth

            if (fullWidth > width) {
              // Case where canvas is less big than the container
              const left = Math.round((fullWidth - width) / 2)
              this.canvas.style.left = left + 'px'
              this.canvas.style.top = '0px'
              this.setAnnotationCanvasDimensions(width, fullHeight)
            } else {
              // Case where canvas is bigger than the container
              const height = ratio ? Math.round(fullWidth / ratio) : fullHeight
              const top = Math.round((fullHeight - height) / 2)
              this.canvas.style.left = '0px'
              this.canvas.style.top = top + 'px'
              this.setAnnotationCanvasDimensions(fullWidth, height)
            }
          }
        } else if (this.isCurrentPreviewPicture && this.isAnnotationCanvas()) {
          if (this.canvas) {
            // Picture ratio

            const naturalDimensions = this.currentPreview.width
              ? {
                  width: this.currentPreview.width,
                  height: this.currentPreview.height
                }
              : this.picturePlayer.getNaturalDimensions()
            const naturalWidth = naturalDimensions.width
            const naturalHeight = naturalDimensions.height
            const ratio = naturalWidth / naturalHeight

            if (!this.$refs['video-container']) return Promise.resolve()

            // Container size
            let fullWidth = this.$refs['video-container'].offsetWidth
            const fullHeight = this.$refs['video-container'].offsetHeight
            if (this.isComparing && !this.isComparisonOverlay) {
              fullWidth = Math.round(fullWidth / 2)
            }

            // Init canvas values
            let width = ratio ? fullHeight * ratio : fullWidth
            let height = ratio ? Math.round(fullWidth / ratio) : fullHeight
            let top = 0
            let left = 0
            this.canvas.style.top = '0px'
            this.canvas.style.left = '0px'

            // Set Canvas width and left position
            if (fullWidth > naturalWidth) {
              // Case where picture is less wide than the container
              // We adapt left position, because there will be margins
              left = Math.round((fullWidth - naturalWidth) / 2)
              this.canvas.style.left = left + 'px'
              width = naturalWidth
            } else if (fullWidth > width) {
              // Case where canvas is less wide than the container
              // We adapt left position
              const left = Math.round((fullWidth - width) / 2)
              this.canvas.style.left = left + 'px'
            } else {
              // Case where canvas is wider than the container
              // We set the width to the container size
              width = fullWidth
            }

            // Set Canvas height and top position
            if (fullHeight > naturalHeight) {
              // Case where picture is less high than the container
              // We adapt top position, because there will be margins
              top = Math.round((fullHeight - naturalHeight) / 2)
              this.canvas.style.top = top + 'px'
              height = naturalHeight
            } else if (fullHeight > height) {
              // Case where canvas is less high than the container
              // We adapt top position
              top = Math.round((fullHeight - height) / 2)
              this.canvas.style.top = top + 'px'
            } else {
              // Height is bigger than the container. So we put it
              // inside the container and adapt width parameters accordingly.
              height = fullHeight
              width = Math.round(height * ratio)
              const left = Math.round((fullWidth - width) / 2)
              this.canvas.style.left = left + 'px'
            }
            this.setAnnotationCanvasDimensions(width, height)
          }
        }
        return Promise.resolve()
      })
    },

    showCanvas() {
      if (this.canvas) this.canvas.style.display = 'block'
    },

    hideCanvas() {
      if (this.canvas) this.canvas.style.display = 'none'
    },

    loadAnnotation(annotation) {
      if (!annotation) return
      this.pause()
      const currentTime = annotation ? annotation.time || 0 : 0
      if (this.rawPlayer || this.picturePlayer) {
        if (this.rawPlayer) {
          const frameNumber = currentTime / this.frameDuration
          this.rawPlayer.setCurrentFrame(frameNumber)
          this.syncComparisonPlayer()
          this.currentTimeRaw = currentTime
          this.updateProgressBar()
        }
        this.clearCanvas()
        this.loadSingleAnnotation(annotation)
      }
    },

    saveAnnotations() {
      let currentTime = roundToFrame(this.currentTimeRaw, this.fps) || 0
      if (currentTime < 0) currentTime = 0
      if (this.isCurrentPreviewPicture) currentTime = 0
      if (!this.annotations) return

      const currentFrame = currentTime / this.frameDuration

      // Get annotations currently stored
      const annotation = this.getAnnotation(currentTime)
      // Get annotation set on the canvas
      const annotations = this.getNewAnnotations(
        currentTime,
        currentFrame,
        annotation
      )
      // Retrieved current entity.
      const entity = this.entityList[this.playingEntityIndex]
      if (!entity) return

      // Build a preview object to handle update
      let preview = {
        id: entity.preview_file_id,
        task_id: entity.preview_file_task_id,
        annotations: entity.preview_file_annotations || []
      }
      // If we are working on a subpreview build the preview object from it.
      if (this.currentPreviewIndex > 0) {
        const index = this.currentPreviewIndex - 1
        const previewFile = this.currentEntity.preview_file_previews[index]
        preview = {
          id: previewFile.id,
          task_id: entity.preview_file_task_id,
          annotations: previewFile.annotations || []
        }
      }

      if (!this.isCurrentUserArtist) {
        // Artists are not allowed to draw
        // Emit an event for remote and store update
        if (!this.notSaved) {
          this.startAnnotationSaving(preview, annotations)
        } else {
          this.$options.changesToSave = { preview, annotations }
        }

        // Update information locally
        entity.preview_file_annotations = annotations
        Object.keys(entity.preview_files).forEach(taskTypeId => {
          let revPreview = null
          entity.preview_files[taskTypeId].forEach(p => {
            if (p.id === preview.id) revPreview = p
            if (!revPreview && p.previews) {
              p.previews.forEach(subPreview => {
                if (subPreview.id === preview.id) revPreview = p
              })
            }
          })
          if (revPreview) {
            this.$store.commit('UPDATE_PREVIEW_ANNOTATION', {
              taskId: preview.task_id,
              preview: revPreview,
              annotations
            })
          }
        })
      }
    },

    onDeleteClicked() {
      this.deleteSelection()
    },

    getAnnotation(time) {
      if (!this.annotations) {
        this.annotations = this.currentEntity.preview_file_annotations
      }
      time = roundToFrame(time, this.fps)

      if (this.annotations && this.annotations.find) {
        let annotation = this.annotations.find(
          annotation => annotation.time === time
        )
        if (!annotation) {
          annotation = this.annotations.find(
            annotation =>
              annotation.time > time - 0.02 && annotation.time < time + 0.02
          )
        }
        if (
          !annotation &&
          this.isCurrentPreviewPicture &&
          this.annotations.length > 0
        ) {
          annotation = this.annotations[0]
          this.$store.commit('UPDATE_ANNOTATION', {
            annotation,
            data: { time: 0 }
          })
        }
        return annotation
      } else {
        this.annotations = []
        return null
      }
    },

    onMetadataLoaded() {
      this.$nextTick(() => {
        this.resetCanvasSize()
        if (this.resetHeight) this.resetHeight()
      })
    },

    clearPlayer() {
      if (this.rawPlayer) this.rawPlayer.clear()
      if (this.isComparing) {
        this.$refs['raw-player-comparison'].clear()
      }
      this.maxDurationRaw = 0
      this.maxDuration = '00:00.000'
    },

    resetPictureCanvas() {
      if (!this.currentPreview) return Promise.resolve()
      this.annotations = this.currentPreview.annotations || []
      return this.resetCanvas().then(() => {
        this.resetCanvasVisibility()
        if (this.isCurrentPreviewPicture) {
          if (!this.isPlaying) this.loadAnnotation(this.getAnnotation(0))
        }
      })
    },

    // Scrubbing

    onCanvasMouseMoved(event) {
      if (this.isCurrentPreviewMovie && this.$options.scrubbing) {
        const x = this.getClientX(event.e)
        if (x - this.$options.scrubStartX < 0) {
          this.goPreviousFrame()
        } else {
          this.goNextFrame()
        }
        this.$options.scrubStartX = x
      }
    },

    onCanvasClicked(event) {
      if (event.button > 1 && this.isCurrentPreviewMovie) {
        this.$options.scrubbing = true
        this.$options.scrubStartX = this.getClientX(event)
        this.$options.scrubStartTime = Number(this.currentTimeRaw)
      }
      return false
    },

    onCanvasReleased() {
      if (this.isCurrentPreviewMovie && this.$options.scrubbing) {
        this.$options.scrubbing = false
      }
      return false
    },

    onTimeCodeClicked({ versionRevision, frame }) {
      const previews = this.currentEntity.preview_files[this.task.task_type_id]
      const previewFile = previews.find(
        p => p.revision === parseInt(versionRevision)
      )
      this.onPreviewChanged(this.currentEntity, previewFile)
      setTimeout(() => {
        this.rawPlayer.setCurrentFrame(frame)
        this.onFrameUpdate(frame)
        this.syncComparisonPlayer()
        this.$nextTick(() => {
          this.reloadCurrentAnnotation()
        })
      }, 100)
    },

    // Annotation extraction

    extractFrame(canvas, frame) {
      this.rawPlayer.setCurrentFrame(frame)
      const video = this.rawPlayer.currentPlayer
      const context = canvas.getContext('2d')
      const dimensions = this.rawPlayer.getNaturalDimensions()
      canvas.width = dimensions.width
      canvas.height = dimensions.height
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
    },

    extractVideoFrame(canvas, frameNumber) {
      return new Promise(resolve => {
        this.rawPlayer.setCurrentFrame(frameNumber)
        this.$nextTick(() => {
          setTimeout(() => {
            this.extractFrame(canvas, frameNumber)
            resolve()
          }, 500)
        })
      })
    },

    async extractAnnotationSnapshots() {
      const currentFrame = this.currentFrame
      const annotations = this.annotations.sort((a, b) => a.time - b.time)
      const files = []
      let index = 1
      for (const annotation of annotations) {
        const canvas = document.getElementById('annotation-snapshot')
        const filename = `annotation ${index}.png`
        const frameNumber =
          roundToFrame(annotation.time, this.fps) / this.frameDuration
        await this.extractVideoFrame(canvas, frameNumber)
        await this.copyAnnotationCanvas(canvas, annotation)
        const file = await this.getFileFromCanvas(canvas, filename)
        files.push(file)
        index++
      }
      this.rawPlayer.setCurrentFrame(currentFrame - 1)
      this.$nextTick(() => {
        this.clearCanvas()
      })
      return files
    },

    getFileFromCanvas(canvas, filename) {
      return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
          const file = new File([blob], filename, {
            type: 'image/png',
            lastModified: new Date().getTime()
          })
          return resolve(file)
        })
      })
    },

    triggerResize() {
      window.dispatchEvent(new Event('resize'))
    }
  },

  watch: {
    isCommentsHidden() {
      if (this.isCurrentPreviewSound) {
        this.soundPlayer?.redraw()
      }
    }
  },

  /* N.B.: socket.events are not part of Vue's mixin boilerplate and
   * must be included explicitly in each component using preview rooms!
   */
  socket: {
    events: {
      'preview-file:annotation-update'(eventData) {
        if (
          !this.tempMode &&
          this.previewFileMap.get(eventData.preview_file_id)
        ) {
          this.refreshPreview({
            previewId: eventData.preview_file_id,
            taskId: this.currentPreview.task_id
          }).then(preview => {
            if (
              !this.notSaved &&
              this.currentPreview.id === eventData.preview_file_id &&
              !this.isWriting(eventData.updated_at)
            ) {
              const isAnnotationSizeChanged =
                this.annotations.length !== preview.annotations.length
              this.annotations = preview.annotations
              const isLiveRoom =
                !this.room.people || this.room.people.length === 0
              if (isAnnotationSizeChanged) this.reloadAnnotations(isLiveRoom)
            }
            this.$emit('annotations-refreshed', preview)
          })
        }
      }
    }
  }
}
